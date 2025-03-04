import React, { useEffect, useState } from "react";
import * as brain from "brain.js";
import Papa from "papaparse";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";


const NeuralNetwork = () => {
  const [trainedModel, setTrainedModel] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [trainingData, setTrainingData] = useState([]);
  const [errors, setErrors] = useState({});
  const [priceComparison, setPriceComparison] = useState([]); // Store actual vs predicted


  const [formData, setFormData] = useState({
    total_sqft: "",
    bath: "",
    balcony: "",
    bedrooms: "",
    location: "",
    age: "",
  });

  useEffect(() => {
    const savedModel = localStorage.getItem("trainedModel");
    const savedTrainingData = localStorage.getItem("preprocessedData");

  if (savedTrainingData) {
    console.log("📌 Loading preprocessed data...");
    setTrainingData(JSON.parse(savedTrainingData));
  } else {
    console.log("⚠️ No preprocessed data found. Fetching and storing...");
    fetchAndStorePreprocessedData(); // ✅ Always fetch and store data
  }
    if (savedModel) {
      console.log("📌 Loading saved model...");
      const net = new brain.NeuralNetwork();
      net.fromJSON(JSON.parse(savedModel));
      setTrainedModel(net);
      console.log("✅ Model loaded successfully!");
    } else {
      console.log("⚠️ No saved model found. Training a new model...");
      fetchCSVAndTrain();
    }
  }, []);

  const fetchAndStorePreprocessedData = () => {
    fetch("/real-estate.csv")
      .then((response) => response.text())
      .then((csvData) => {
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const processedData = preprocessData(result.data);
  
            localStorage.setItem("preprocessedData", JSON.stringify(processedData)); // ✅ Ensure preprocessed data is saved
            console.log("💾 Preprocessed data saved!", processedData);
  
            setTrainingData(processedData);
          },
        });
      })
      .catch((error) => console.error("❌ Error fetching CSV:", error));
  };

  const fetchCSVAndTrain = () => {
    fetch("/real-estate.csv")
      .then((response) => response.text())
      .then((csvData) => {
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const processedData = preprocessData(result.data);
            if (processedData.length === 0) return;
           
            localStorage.setItem("preprocessedData", JSON.stringify(processedData)); // ✅ Store preprocessed data
            console.log("💾 Preprocessed data saved!", processedData); // ✅ Log for verification
            setTrainingData(processedData);

            trainModel(processedData);
          },
        });
      })
      .catch((error) => console.error("❌ Error fetching CSV:", error));
  };

  const preprocessData = (data) => {
    return data
      .map((row) => {
        const total_sqft = parseFloat(row.total_sqft);
        const bath = parseFloat(row.bath);
        const balcony = parseFloat(row.balcony);
        const price = parseFloat(row.price);
        const bedrooms = parseInt(row.size.split(" ")[0]);
        const age = parseInt(row.age) || 0;

        if (isNaN(total_sqft) || isNaN(bath) || isNaN(balcony) || isNaN(price) || isNaN(bedrooms) || isNaN(age)) {
          console.warn("⚠️ Skipping invalid row:", row);
          return null;
        }

        return {
          input: [total_sqft / 5000, bedrooms / 5, bath / 5, balcony / 5, age / 50],
          output: [price / 1000000],
        };
      })
      .filter((row) => row !== null);
  };

  const trainModel = (data) => {
    if (data.length === 0) {
      console.error("❌ No valid data to train!");
      return;
    }

    console.log("🚀 Training Neural Network...");
    const net = new brain.NeuralNetwork({ hiddenLayers: [10] });

    try {
      net.train(data, {
        iterations: 5000,
        errorThresh: 0.005,
        log: (stats) => console.log(`Training Progress:`, stats),
      });

      console.log("✅ Model training completed!");
      const modelJSON = net.toJSON();
      localStorage.setItem("trainedModel", JSON.stringify(modelJSON));
      console.log("💾 Model saved!");
      setTrainedModel(net);
    } catch (error) {
      console.error("❌ Error training model:", error);
    }
  };

  const validateForm = () => {
    let newErrors = {};
  
    Object.keys(formData).forEach((key) => {
      if (key === "location") {
        if (!formData[key] || !/^[a-zA-Z\s]+$/.test(formData[key])) {
          newErrors[key] = "This field is required and must contain only alphabets.";
        }
      } else {
        if (!formData[key] || isNaN(parseFloat(formData[key])) || parseFloat(formData[key]) <= 0) {
          newErrors[key] = "This field is required and must be a valid number greater than 0.";
        }
      }
    });
  
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handlePredict = () => {
    if (!validateForm()) return;

    if (!trainedModel) {
      console.error("❌ Model is not trained yet!");
      return;
    }

    const inputData = [
      parseFloat(formData.total_sqft) / 5000,
      parseFloat(formData.bedrooms) / 5,
      parseFloat(formData.bath) / 5,
      parseFloat(formData.balcony) / 5,
      parseFloat(formData.age) / 50,
    ];

    const predictedPrice = trainedModel.run(inputData) * 1000000;
    setPrediction(predictedPrice.toFixed(2));
    

    // Store predicted vs actual price
    const actualPrice = trainingData.length > 0 ? trainingData[0].actualPrice : 0; // Mocking actual price
    setPriceComparison([...priceComparison, { name: `Prediction ${priceComparison.length + 1}`, actual: actualPrice, predicted: predictedPrice }]);
  };

  return (
    <div className="app-container">
      <div className="card">
        <div className="image-container">
          <img src="https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg" alt="House Preview" />
        </div>

        <div className="form-container" style={{ maxWidth: "400px", margin: "auto", padding: "20px", textAlign: "center" }}>
          <h2 style={{ color: "#333", marginBottom: "20px" }}>🏡 Real Estate Price Predictor</h2>

          <div className="input-group" style={{ marginBottom: "15px", textAlign: "left" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>🏡 Area (sq ft):</label>
           
            <input type="text" name="total_sqft" value={formData.total_sqft} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }} />
            {errors.total_sqft && <div style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>{errors.total_sqft}</div>}

          </div>

          <div className="input-group" style={{ marginBottom: "15px", textAlign: "left" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>🛏 Bedrooms:</label>
            <input type="text" name="bedrooms" value={formData.bedrooms} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }} />
            {errors.bedrooms && <div style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>{errors.bedrooms}</div>}

          </div>

          <div className="input-group" style={{ marginBottom: "15px", textAlign: "left" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>🛁 Bathrooms:</label>
            <input type="text" name="bath" value={formData.bath} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }} />
            {errors.bath && <div style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>{errors.bath}</div>}

          </div>

          <div className="input-group" style={{ marginBottom: "15px", textAlign: "left" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>🌅 Balcony:</label>
            <input type="text" name="balcony" value={formData.balcony} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }} />
            {errors.balcony && <div style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>{errors.balcony}</div>}

          </div>

          <div className="input-group" style={{ marginBottom: "15px", textAlign: "left" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>📍 Location:</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }} />
            {errors.location && <div style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>{errors.location}</div>}

          </div>

          <div className="input-group" style={{ marginBottom: "15px", textAlign: "left" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>⏳ Age of Property:</label>
            <input type="text" name="age" value={formData.age} onChange={handleChange} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }} />
            {errors.age && <div style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>{errors.age}</div>}
          </div>

          <button className="predict-button" onClick={handlePredict} style={{ width: "100%", padding: "10px", background: "#007bff", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" }}>Predict Price</button>

          {prediction && <h3 className="prediction" style={{ marginTop: "20px", color: "#28a745" }}>💰 Predicted Price: ${prediction} (in lakhs of dollars)</h3>}
          {priceComparison.length > 0 && (
        <div style={{ width: "80%", margin: "auto" }}>
          <h3>📊 Price Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#8884d8" />
              <Line type="monotone" dataKey="predicted" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
        </div>

      </div>

      <style>
        {`
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #6e8efb, #a777e3);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }

          .card {
            width: 85%;
            max-width: 1200px;
            height: auto;
            display: flex;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            align-items: center;
          }

          .image-container img {
            width: 100%;
            max-width: 400px;
            height: auto;
            border-radius: 10px;
          }

          @media (max-width: 1023px) {
            .card {
              flex-direction: column;
              height: auto;
            }
          }

          @media (max-width: 767px) {
            .image-container {
              display: none;
            }
          }
        `}
      </style>
    </div>
  );
};

export default NeuralNetwork;
