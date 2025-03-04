import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';

const NormalizeCSV = () => {
  const [normalizedData, setNormalizedData] = useState(null);
  const [error, setError] = useState(null);

  // Function to normalize data using Min-Max scaling
  const normalize = (value, min, max) => {
    return (value - min) / (max - min);
  };

  // Find the min and max for each numeric column (price, sqft, bedrooms, bathrooms)
  const getMinMax = (col, rows) => {
    const values = rows.map((row) => parseFloat(row[col])).filter((val) => !isNaN(val));
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max };
  };

  // Automatically load and normalize the data on component mount
  useEffect(() => {
    // Replace with the path to your CSV file inside the public folder
    const filePath = '/real-estate.csv';

    fetch(filePath)
      .then((response) => response.text())
      .then((csvText) => {
        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });

        if (parsedData.errors.length) {
          setError('Error parsing CSV file');
          return;
        }

        const rows = parsedData.data;

        const priceMinMax = getMinMax('price', rows);
        const sqftMinMax = getMinMax('sqft', rows);
        const bedroomsMinMax = getMinMax('bedrooms', rows);
        const bathroomsMinMax = getMinMax('bathrooms', rows);

        // Normalize the data
        const normalizedRows = rows.map((row) => {
          return {
            ...row,
            price: normalize(parseFloat(row.price), priceMinMax.min, priceMinMax.max),
            sqft: normalize(parseFloat(row.sqft), sqftMinMax.min, sqftMinMax.max),
            bedrooms: normalize(parseFloat(row.bedrooms), bedroomsMinMax.min, bedroomsMinMax.max),
            bathrooms: normalize(parseFloat(row.bathrooms), bathroomsMinMax.min, bathroomsMinMax.max),
          };
        });

        // Store normalized data in the state (or in localStorage/sessionStorage if needed)
        setNormalizedData(normalizedRows);

        // Optionally, store in localStorage (or sessionStorage)
        localStorage.setItem('normalizedRealEstateData', JSON.stringify(normalizedRows));
      })
      .catch((error) => {
        console.error('Error loading CSV file:', error);
        setError('Error loading CSV file');
      });
  }, []);

  return (
    <div>
      <h1>Normalized Real Estate Data</h1>

      {/* Error handling */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Display normalized data */}
      {normalizedData && (
        <div>
          <h2>Normalized Data</h2>
          <pre>{JSON.stringify(normalizedData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default NormalizeCSV;
