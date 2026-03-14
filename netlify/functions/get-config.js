const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const store = getStore('pranzo-config');
    let config = {};
    try {
      const raw = await store.get('config');
      if (raw) config = JSON.parse(raw);
    } catch(e) { /* first run, no config yet */ }

    // Default values
    const result = {
      eventDate: config.eventDate || '2026-03-15',
      bookingDeadline: config.bookingDeadline || '2026-03-13',
      maxSeats: config.maxSeats || 320,
      bookingOpen: config.bookingOpen !== false,
      paypalClientId: config.paypalClientId || '',
      satispayLink: config.satispayLink || '',
      emailjsServiceId: config.emailjsServiceId || '',
      emailjsTemplateId: config.emailjsTemplateId || '',
      emailjsPublicKey: config.emailjsPublicKey || '',
      adminEmail: config.adminEmail || 'giovanni.grimoldi93@gmail.com',
      menuItems: config.menuItems || [
        { id: 'adulto', name: 'Polenta – Adulto', description: 'Porzione adulto', price: '12.00' },
        { id: 'bambino', name: 'Polenta – Bambino', description: 'Porzione bambino', price: '10.00' },
        { id: 'dolce', name: 'Dolce', description: 'Aggiunta al menù', price: '2.00' },
      ]
    };

    // Count booked seats from bookings store
    try {
      const bookingsStore = getStore('pranzo-bookings');
      const keys = await bookingsStore.list();
      let booked = 0;
      for (const key of (keys.blobs || [])) {
        try {
          const raw = await bookingsStore.get(key.key);
          const b = JSON.parse(raw);
          if (b.status !== 'cancelled') {
            booked += (b.items || []).reduce((a, i) => a + (i.qty || 1), 0);
          }
        } catch(e) {}
      }
      result.bookedSeats = booked;
    } catch(e) {}

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result)
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
