export function localPanelAddress(value) {
  const match = /^(?:http:\/\/)?(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})\/?$/i.exec(value.trim());
  if (!match) return null;
  const octets = match[1].split('.').map(Number);
  const [first, second] = octets;
  const port = Number(match[2]);
  if (octets.some(part => part > 255) || port < 1024 || port > 65535) return null;
  const local = first === 10 || first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254);
  return local ? 'http://' + octets.join('.') + ':' + port + '/' : null;
}

export const english = typeof document !== "undefined" && document.documentElement.lang === "en-US";
const copy = (pt, en) => english ? en : pt;

function setupWorkflows(root) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  function select(index, focus = false) {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!direction && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const next = direction ? (index + direction + tabs.length) % tabs.length : event.key === 'Home' ? 0 : tabs.length - 1;
      select(next, true);
    });
  });
}

function setupMenu(dialog) {
  const trigger = document.querySelector('[data-menu-open]');
  trigger.addEventListener('click', () => {
    dialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target.closest('a, [data-menu-close]')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
  });
  for (const link of dialog.querySelectorAll('nav a')) {
    if (link.pathname === location.pathname && !link.hash) link.setAttribute('aria-current', 'page');
  }
  trigger.hidden = false;
}

function setupCopy(button) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const status = document.querySelector('[data-copy-status]');
    try {
      await navigator.clipboard.writeText('mechylcontato505@gmail.com');
      status.textContent = copy('E-mail copiado.', 'Email copied.');
    } catch {
      status.textContent = copy('Selecione e copie o endereço de e-mail exibido acima.', 'Select and copy the email address shown above.');
    }
  });
}

function setupSavings(root) {
  const task = root.querySelector('#savings-task');
  const fields = [...root.querySelectorAll('input')];
  const value = root.querySelector('[data-saving]');
  const label = root.querySelector('[data-saving-label]');
  const presets = {
    cadastro: [100, 45, 90, 20],
    fatura: [60, 60, 150, 55],
    cruzamento: [250, 30, 45, 8]
  };

  function update() {
    if (fields.some(input => !input.value || !input.validity.valid)) {
      value.textContent = '—';
      label.textContent = copy(' Preencha os campos com valores válidos.', ' Enter valid values in all fields.');
      return;
    }
    const [volume, setup, manual, automated] = fields.map(input => input.valueAsNumber);
    const minutes = Math.round((volume * 4 * (manual - automated)) / 60 - setup);
    const absolute = Math.abs(minutes);
    const hours = Math.floor(absolute / 60);
    value.textContent = hours ? hours + ' h ' + (absolute % 60) + ' min' : absolute + ' min';
    label.textContent = minutes >= 0 ? copy(' de economia estimada no primeiro mês', ' estimated savings in the first month') : copy(' a mais com a automação no primeiro mês', ' more with automation in the first month');
  }

  task.addEventListener('change', () => {
    fields.forEach((input, index) => { input.value = presets[task.value][index]; });
    update();
  });
  root.addEventListener('input', update);
  update();
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-workflows]').forEach(setupWorkflows);
  document.querySelectorAll('[data-savings]').forEach(setupSavings);
  document.querySelectorAll('.site-menu').forEach(setupMenu);
  document.querySelectorAll('[data-copy]').forEach(setupCopy);
}
