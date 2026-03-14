const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const booking = JSON.parse(event.body);

    // Validate required fields
    if (!booking.nome || !booking.cognome || !booking.email) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Dati mancanti' }) };
    }
    if (!booking.items || !booking.items.length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Nessuna voce selezionata' }) };
    }

    // Check availability
    const configStore = getStore('pranzo-config');
    let config = {};
    try {
      const raw = await configStore.get('config');
      if (raw) config = JSON.parse(raw);
    } catch(e) {}

    const maxSeats = config.maxSeats || 320;
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
    const newPax = (booking.items || []).reduce((a, i) => a + (i.qty || 1), 0);
    if (booked + newPax > maxSeats) {
      return { statusCode: 409, body: JSON.stringify({ message: 'Spiacenti, posti esauriti.' }) };
    }

    // Save booking
    const id = crypto.randomUUID();
    booking.id = id;
    booking.createdAt = new Date().toISOString();
    await bookingsStore.set(id, JSON.stringify(booking));

    // Send email via EmailJS (server-side call if keys configured)
    if (config.emailjsServiceId && config.emailjsTemplateId && config.emailjsPublicKey) {
      try {
        const itemsStr = (booking.items || []).map(i => `${i.qty}× ${i.name} (€${(i.qty * parseFloat(i.price)).toFixed(2)})`).join('\n');
        const metodiLabel = { paypal: 'PayPal', satispay: 'Satispay', secretariat: 'Segreteria parrocchiale' };
        await fetch(`https://api.emailjs.com/api/v1.0/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: config.emailjsServiceId,
            template_id: config.emailjsTemplateId,
            user_id: config.emailjsPublicKey,
            template_params: {
              to_email: booking.email,
              nome: booking.nome,
              cognome: booking.cognome,
              booking_id: id.substring(0, 8).toUpperCase(),
              items: itemsStr,
              totale: `€${(booking.total || 0).toFixed(2)}`,
              metodo: metodiLabel[booking.paymentMethod] || booking.paymentMethod,
              stato: booking.status === 'paid' ? 'Pagamento confermato ✅' : 'In attesa di pagamento ⏳',
              note: booking.note || '–'
            }
          })
        });
        // Notify admin
        if (config.adminEmail) {
          await fetch(`https://api.emailjs.com/api/v1.0/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: config.emailjsServiceId,
              template_id: config.emailjsTemplateId,
              user_id: config.emailjsPublicKey,
              template_params: {
                to_email: config.adminEmail,
                nome: 'Admin',
                cognome: '',
                booking_id: id.substring(0, 8).toUpperCase(),
                items: `Nuova prenotazione da ${booking.nome} ${booking.cognome}\n` + itemsStr,
                totale: `€${(booking.total || 0).toFixed(2)}`,
                metodo: metodiLabel[booking.paymentMethod] || booking.paymentMethod,
                stato: 'Nuova prenotazione ricevuta',
                note: booking.note || '–'
              }
            })
          });
        }
      } catch(emailErr) {
        console.error('Email error:', emailErr);
        // Don't fail the booking if email fails
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ id, ok: true })
    };
  } catch(e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ message: 'Errore server: ' + e.message }) };
  }
};
