const http = require('http');

http.get('http://localhost:8000/api/inventory/stock_balance_report/', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      let totalAdjustments = 0;
      console.log('--- Adjustments Found ---');
      json.forEach(item => {
        if (item.total_adjustments > 0) {
          console.log(`Item: ${item.item_name} | Adjusted: ${item.total_adjustments}`);
          totalAdjustments += item.total_adjustments;
        }
      });
      if (totalAdjustments === 0) {
        console.log('No adjustments found in the system yet.');
      }
      console.log('-------------------------');
      console.log(`Total System Adjustments: ${totalAdjustments}`);
    } catch (e) {
      console.error('Failed to parse JSON response. Is the server running?');
    }
  });
}).on("error", (err) => {
  console.log("Error connecting to API: " + err.message);
});
