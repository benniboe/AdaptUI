// Nutzt TensorFlow.js für Vorhersagen des nächsten Seitenbesuchs basierend auf Klicksequenzen

class NextPagePredictor {
    constructor() {
        this.model = null;
        this.isTraining = false;
        this.isTrained = false;
        
        // Definiere Seiten und ihre Indexes
        this.pageToIndex = {
            'home': 0,
            'about': 1,
            'blog': 2,
            'projects': 3,
            'contact': 4
        };
        
        this.indexToPage = ['home', 'about', 'blog', 'projects', 'contact'];
        this.numPages = this.indexToPage.length;
        
        console.log('ML Vorhersage: Initialized with', this.numPages, 'pages');
    }
    
    // TRAINING
    
    async train(clickSequence) {
        if (this.isTraining) {
            console.log('ML Vorhersage: Already training, skipping...');
            return false;
        }
        
        this.isTraining = true;
        
        try {
            console.log('ML Vorhersage: Training on', clickSequence.length, 'sequences');
            
            // minimum data check
            if (clickSequence.length < 15) {
                console.log('ML Vorhersage: Need at least 15 clicks (have ' + clickSequence.length + ')');
                this.isTraining = false;
                return false;
            }
            
            // training data vorbereiten
            const { inputs, outputs } = this.prepareTrainingData(clickSequence);
            
            if (inputs.length < 10) {
                console.log('ML Vorhersage: Not enough valid training pairs');
                this.isTraining = false;
                return false;
            }
            
            console.log('ML Vorhersage: Created', inputs.length, 'training examples');
            
            // Create neural network
            if (!this.model) {
                this.model = this.createModel();
            }
            
            // Convert to tensors
            const xs = tf.tensor2d(inputs);
            const ys = tf.tensor2d(outputs);
            
            // Train the model
            console.log('ML Vorhersage: Training neural network...');
            
            await this.model.fit(xs, ys, {
                epochs: 30,
                batchSize: 8,
                shuffle: true,
                verbose: 0,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        if (epoch % 10 === 0) {
                            console.log(`ML Vorhersage: Epoch ${epoch}, Loss: ${logs.loss.toFixed(4)}`);
                        }
                    }
                }
            });
            
            // Cleanup tensors
            xs.dispose();
            ys.dispose();
            
            this.isTrained = true;
            console.log('ML Vorhersage: Training complete!');
            
            this.isTraining = false;
            return true;
            
        } catch (error) {
            console.error('ML Vorhersage: Training error:', error);
            this.isTraining = false;
            return false;
        }
    }
    
    // Create the neural network model
    createModel() {
        console.log('ML Vorhersage: Creating neural network...');
        
        const model = tf.sequential({
            layers: [
                // Input layer: one-hot encoded
                tf.layers.dense({
                    inputShape: [this.numPages],
                    units: 16,
                    activation: 'relu',
                    kernelInitializer: 'heNormal'
                }),
                
                // Hidden layer
                tf.layers.dropout({ rate: 0.2 }),
                
                tf.layers.dense({
                    units: 8,
                    activation: 'relu',
                    kernelInitializer: 'heNormal'
                }),
                
                // Output layer: wahrscheinlichkeiten für jede Seite
                tf.layers.dense({
                    units: this.numPages,
                    activation: 'softmax'
                })
            ]
        });
        
        // Compile model
        model.compile({
            optimizer: tf.train.adam(0.01),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        
        console.log('ML Vorhersage: Model created');
        model.summary();
        
        return model;
    }
    
    // training data von click sequence vorbereiten
    prepareTrainingData(clickSequence) {
        const inputs = [];
        const outputs = [];
        
        // input-output paare erstellen
        for (let i = 0; i < clickSequence.length - 1; i++) {
            const currentPage = clickSequence[i].to.toLowerCase();
            const nextPage = clickSequence[i + 1].to.toLowerCase();
            
            // Check dictionary
            if (currentPage in this.pageToIndex && nextPage in this.pageToIndex) {
                // One-hot encode current page (input)
                const input = new Array(this.numPages).fill(0);
                input[this.pageToIndex[currentPage]] = 1;
                inputs.push(input);
                
                // One-hot encode next page (output)
                const output = new Array(this.numPages).fill(0);
                output[this.pageToIndex[nextPage]] = 1;
                outputs.push(output);
            }
        }
        
        return { inputs, outputs };
    }
    
    // Vorhersage
    
    predict(currentPage) {
        if (!this.isTrained || !this.model) {
            console.log('ML Vorhersage: Model not trained yet');
            return null;
        }
        
        currentPage = currentPage.toLowerCase();
        
        if (!(currentPage in this.pageToIndex)) {
            console.log('ML Vorhersage: Unknown page:', currentPage);
            return null;
        }
        
        try {
            // One-hot encode current page
            const input = new Array(this.numPages).fill(0);
            input[this.pageToIndex[currentPage]] = 1;
            
            // Predict
            const inputTensor = tf.tensor2d([input]);
            const prediction = this.model.predict(inputTensor);
            const probabilities = prediction.dataSync();
            
            // Cleanup
            inputTensor.dispose();
            prediction.dispose();
            
            // finde seite mit highest probability
            let maxProb = 0;
            let predictedIndex = 0;
            
            for (let i = 0; i < probabilities.length; i++) {
                if (probabilities[i] > maxProb) {
                    maxProb = probabilities[i];
                    predictedIndex = i;
                }
            }
            
            const predictedPage = this.indexToPage[predictedIndex];
            
            // confidence chacken
            if (maxProb < 0.3) {
                console.log('ML Vorhersage: Low confidence prediction, skipping');
                return null;
            }
            
            console.log(`ML Vorhersage: "${currentPage}" → "${predictedPage}" (${(maxProb * 100).toFixed(1)}% confident)`);
            
            return {
                page: predictedPage,
                confidence: maxProb,
                allProbabilities: Array.from(probabilities).map((prob, idx) => ({
                    page: this.indexToPage[idx],
                    probability: prob
                }))
            };
            
        } catch (error) {
            console.error('ML Vorhersage: Prediction error:', error);
            return null;
        }
    }
    
    // Hilfsfunktionen
    
    // model accuracy on training data bewerten
    async evaluateAccuracy(clickSequence) {
        if (!this.isTrained || !this.model) return 0;
        
        const { inputs, outputs } = this.prepareTrainingData(clickSequence);
        
        if (inputs.length === 0) return 0;
        
        const xs = tf.tensor2d(inputs);
        const ys = tf.tensor2d(outputs);
        
        const evaluation = this.model.evaluate(xs, ys);
        const accuracy = await evaluation[1].data();
        
        xs.dispose();
        ys.dispose();
        evaluation[0].dispose();
        evaluation[1].dispose();
        
        return accuracy[0];
    }
    
    // Clear model (for reset)
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
            this.isTrained = false;
            console.log('ML Vorhersage: Model disposed');
        }
    }
}

// global verfügbar machen
if (typeof window !== 'undefined') {
    window.NextPagePredictor = NextPagePredictor;
}