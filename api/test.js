export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: 'ok',
    message: 'API is working',
    timestamp: new Date().toISOString(),
    mock_customers: [
      { id: 'C001', name: 'ABC Store', phone: '3175096262', state: 'IN' },
      { id: 'C002', name: 'XYZ Shop', phone: '4125551234', state: 'PA' }
    ]
  });
}
