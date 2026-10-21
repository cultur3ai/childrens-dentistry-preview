/* Appointment form -> local intake agent.
   Posts same-origin to /api/intake, renders validation and confirmation in place.
   Written against the contract in app/booking_server.py: nothing here assumes a slot the API did not return. */
(function () {
  'use strict';
  var form = document.getElementById('intake-form');
  if (!form) return;

  var status = document.getElementById('form-status');
  var btn = form.querySelector('[type="submit"]');
  var resultPanel = document.getElementById('booking-result');
  var FIELDS = ['parent_name', 'child_name', 'child_dob', 'phone', 'email', 'visit_type', 'insurance'];

  function setStatus(msg, tone) {
    if (!status) return;
    status.textContent = msg || '';
    status.dataset.tone = tone || '';
  }

  function clearErrors() {
    FIELDS.forEach(function (name) {
      var input = form.elements[name];
      var slot = document.querySelector('[data-error-for="' + name + '"]');
      if (input) input.removeAttribute('aria-invalid');
      if (slot) { slot.textContent = ''; slot.hidden = true; }
    });
  }

  function showErrors(errors) {
    var first = null;
    Object.keys(errors || {}).forEach(function (name) {
      var slot = document.querySelector('[data-error-for="' + name + '"]');
      var input = form.elements[name];
      if (slot) { slot.textContent = errors[name]; slot.hidden = false; }
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        if (!first) first = input;
      }
    });
    if (first) {
      first.focus();
      setStatus('Please check the highlighted fields.', 'error');
    }
  }

  function payload() {
    var days = [];
    form.querySelectorAll('input[name="preferred_days"]:checked').forEach(function (c) { days.push(c.value); });
    var window_ = form.querySelector('input[name="preferred_window"]:checked');
    return {
      parent_name: (form.elements.parent_name.value || '').trim(),
      child_name: (form.elements.child_name.value || '').trim(),
      child_dob: (form.elements.child_dob.value || '').trim(),
      phone: (form.elements.phone.value || '').trim(),
      email: (form.elements.email.value || '').trim(),
      visit_type: form.elements.visit_type.value,
      insurance: form.elements.insurance.value,
      preferred_days: days.length ? days : ['Mon', 'Tue', 'Wed', 'Thu'],
      preferred_window: window_ ? window_.value : 'either',
      notes: (form.elements.notes.value || '').trim()
    };
  }

  /* Shown when the page is served from a static preview host: the intake agent is
     a live service, not part of the static copy. No fake confirmation. */
  function renderPreviewNote() {
    if (!resultPanel) return;
    resultPanel.innerHTML =
      '<div class="result-card" role="status">' +
        '<p class="result-kicker">Preview page</p>' +
        '<h2 class="result-headline">The booking agent is not connected on this preview.</h2>' +
        '<p class="result-when">On the live site this form reads what a parent writes, holds a slot on the ' +
          'Monday&ndash;Thursday schedule, hands your front desk a one-line summary &mdash; and sends anything ' +
          'urgent (swelling, a knocked-out tooth) straight to a phone call instead of a booking.</p>' +
        '<p class="result-call"><a href="tel:+17724033533">Call (772) 403-3533</a> to see it run.</p>' +
        '<ul class="result-steps">' +
          '<li>Or call the practice as usual: <a href="tel:+17722831230">(772) 283-1230</a>.</li>' +
        '</ul>' +
      '</div>';
    resultPanel.hidden = false;
    form.hidden = true;
    setStatus('', '');
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderConfirmation(data) {
    if (!resultPanel) return;
    var steps = (data.next_steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    var headline = data.call_required
      ? 'Please call us now — do not wait for a confirmation'
      : esc(data.message || 'Your appointment is booked.');
    var ref = data.booking_ref ? '<p class="result-ref">Reference <strong>' + esc(data.booking_ref) + '</strong></p>' : '';
    var when = data.slot
      ? '<p class="result-when">' + esc(data.slot.label) + ' · ' + esc(data.slot.duration_minutes) + ' minutes</p>'
      : '';
    var call = data.call_required
      ? '<p class="result-call"><a href="tel:+17722831230">(772) 283-1230</a></p>'
      : '';
    var flags = (data.classification && data.classification.flags || []).map(function (f) {
      return '<li>' + esc(f) + '</li>';
    }).join('');

    resultPanel.innerHTML =
      '<div class="result-card' + (data.call_required ? ' is-urgent' : '') + '" role="status">' +
        '<p class="result-kicker">' + (data.call_required ? 'Needs a phone call' : 'Request received') + '</p>' +
        '<h2 class="result-headline">' + headline + '</h2>' +
        when + ref + call +
        (steps ? '<ul class="result-steps">' + steps + '</ul>' : '') +
        (flags ? '<div class="result-flags"><p>Noted for our team</p><ul>' + flags + '</ul></div>' : '') +
      '</div>';

    resultPanel.hidden = false;
    form.hidden = true;
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var h = resultPanel.querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    setStatus('Sending your request…', 'busy');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending…'; }

    fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload())
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false }; }).then(function (body) {
        return { status: r.status, body: body };
      });
    }).then(function (res) {
      if (res.body && res.body.errors) {
        showErrors(res.body.errors);
        return;
      }
      if (res.body && res.body.ok) {
        setStatus('', '');
        renderConfirmation(res.body);
        return;
      }
      /* A static preview host has no /api/intake. Say so plainly instead of
         showing a broken-form error — and never pretend a booking was made. */
      if (res.status === 404 || res.status === 405 || res.status === 0) {
        renderPreviewNote();
        return;
      }
      setStatus(res.body && res.body.message
        ? res.body.message
        : 'Something went wrong on our end. Please call (772) 283-1230.', 'error');
    }).catch(function () {
      renderPreviewNote();
    }).then(function () {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Request appointment'; }
    });
  });
})();
