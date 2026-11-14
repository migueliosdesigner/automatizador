import { english, localPanelAddress } from "./site.js";

const englishCopy = {
  "Aguardando": "Waiting",
  "Em execução": "Running",
  "Em pausa": "Paused",
  "Concluída": "Completed",
  "Falhou": "Failed",
  "Interrompida": "Stopped",
  "Ignorada": "Skipped",
  "Desativada": "Disabled",
  "Não executada": "Not run",
  "Confira o código de acesso.": "Check the access code.",
  "Muitas tentativas. Aguarde um minuto.": "Too many attempts. Wait a minute.",
  "Já há um comando pendente.": "A command is already pending.",
  "Comando indisponível.": "Command unavailable.",
  "Resposta incompatível do painel.": "Incompatible response from the panel.",
  "Estado desconhecido": "Unknown status",
  "Execução atual": "Current run",
  "Última execução": "Last run",
  "Preparando execução…": "Preparing the run…",
  "Etapa ": "Step ",
  "Nenhum macro encontrado.": "No matching macros.",
  "Nenhum macro disponível.": "No macros available.",
  " ação": " action",
  " ações": " actions",
  "Ver ações": "View actions",
  "Ver painel de operação": "View control panel",
  "Conectar ao meu computador": "Connect to my computer",
  "Computador": "Computer",
  "Conectado ao computador": "Connected to the computer",
  "Reconectando · Dados desatualizados": "Reconnecting · Data may be outdated",
  "Conexão indisponível · Dados desatualizados": "Connection unavailable · Data may be outdated",
  "Comando enviado": "Command sent",
  "Pronto para executar": "Ready to run",
  "O computador ainda não confirmou o comando.": "The computer has not confirmed the command yet.",
  "Não foi possível confirmar o envio do comando.": "Could not confirm that the command was sent.",
  "Conexão indisponível. Confira o IP, o domínio autorizado no app e a permissão de rede local do navegador.": "Connection unavailable. Check the IP address, the domain authorized in the app and your browser's local network permission.",
  "Informe o endereço IPv4 local e a porta que aparecem no app.": "Enter the local IPv4 address and port shown in the app.",
  "Conectando…": "Connecting…"
};
const t = value => english && Object.hasOwn(englishCopy, value) ? englishCopy[value] : value;

const byId = id => document.getElementById(id);
const labels = {waiting:t("Aguardando"),running:t("Em execução"),paused:t("Em pausa"),done:t("Concluída"),failed:t("Falhou"),stopped:t("Interrompida"),skipped:t("Ignorada"),disabled:t("Desativada"),not_run:t("Não executada")};
const timeFormat = new Intl.NumberFormat(english ? "en-US" : "pt-BR", {minimumFractionDigits:2,maximumFractionDigits:2});
const fold = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const cards = new Map();
let origin = "", code = "", state = null, connected = false, failures = 0;
let session = 0;
let lastNotice = "", noticeTimer;
let refreshing = false, sending = false, pending = null, feedback = "";
let runRows = [], runLayout = "", stopPinned = false, runWasActive = false;

async function request(path, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const options = {mode:"cors", credentials:"omit", redirect:"error", cache:"no-store", targetAddressSpace:new URL(origin).hostname.startsWith("127.") ? "loopback" : "local", headers:{Authorization:"Bearer " + code},signal:controller.signal};
  if (payload) {
    options.method = "POST";
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }
  try {
    const response = await fetch(new URL(path, origin), options);
    if (!response.ok) {
      const messages = {401:t("Confira o código de acesso."),429:t("Muitas tentativas. Aguarde um minuto."),409:t("Já há um comando pendente.")};
      const error = new Error(messages[response.status] || t("Comando indisponível."));
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    if (payload ? response.status !== 202 || data?.accepted !== true : !validState(data)) {
      throw new Error(t("Resposta incompatível do painel."));
    }
    return data;
  } finally { clearTimeout(timeout); }
}

function validState(data) {
  const steps = value => Array.isArray(value) && value.every(step =>
    step && typeof step.path === "string" && typeof step.label === "string" &&
    Number.isInteger(step.depth) && typeof step.status === "string");
  return data && typeof data.busy === "boolean" && typeof data.pending === "boolean" &&
    Array.isArray(data.macros) && data.macros.every(name => typeof name === "string") &&
    data.steps && typeof data.steps === "object" && Object.values(data.steps).every(steps) &&
    (data.run == null || (typeof data.run.name === "string" && steps(data.run.steps)));
}

function writeText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}
function setDisabled(button, disabled) {
  button.setAttribute("aria-disabled", String(disabled));
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function stepRow(step) {
  const item = element("li","step"), name = element("div","step-name");
  const number = element("span","step-number",step.path);
  name.dataset.depth = String(Math.max(0, Math.min(step.depth, 5)));
  name.append(number, document.createTextNode(step.label));
  const meta = element("div","meta"), badge = element("span","badge"), time = element("span","time");
  meta.append(badge,time);
  item.append(name,meta);
  return {item,badge,time};
}
function showMetric(row, step) {
  row.badge.dataset.state = step.status;
  writeText(row.badge, (Object.hasOwn(labels,step.status) ? labels[step.status] : t("Estado desconhecido")));
  const measured = step.count > 0 && Number.isFinite(step.seconds);
  writeText(row.time, measured ? timeFormat.format(step.seconds) + " s" + (step.count > 1 ? " · " + step.count + "×" : "") : "—");
}
function renderRun() {
  const run = state.run;
  const active = Boolean(state.busy || state.pending);
  byId("run").hidden = !run && !active;
  if (active) stopPinned = true;
  else if (connected) stopPinned = false;
  byId("stop").hidden = !stopPinned;
  document.body.classList.toggle("has-stop",stopPinned);
  setDisabled(byId("stop"), !connected || sending || pending?.action === "stop");
  if (!run && !active) return;
  writeText(byId("run-title"), active ? t("Execução atual") : t("Última execução"));
  const preparing = state.pending && !state.busy;
  writeText(byId("run-name"), preparing ? (state.message || t("Preparando execução…")) :
    [run?.name || state.active, (Object.hasOwn(labels,run?.status) ? labels[run.status] : "")].filter(Boolean).join(" · "));
  const steps = !preparing && run?.steps || [];
  const current = active ? steps.filter(step => ["running","paused"].includes(step.status)).at(-1) : null;
  byId("current-step").hidden = !current;
  writeText(byId("current-step"), current ? t("Etapa ") + current.path + " · " + current.label : "");
  byId("run-details").hidden = !steps.length;
  if (active && !runWasActive && !runLayout) byId("run-details").open = true;
  runWasActive = active;
  const layout = JSON.stringify([run?.name,steps.map(step => [step.path,step.label,step.depth])]);
  if (layout !== runLayout) {
    runLayout = layout;
    runRows = steps.map(stepRow);
    byId("run-steps").replaceChildren(...runRows.map(row => row.item));
  }
  steps.forEach((step,index) => showMetric(runRows[index],step));
}
function makeCard(name) {
  const card = element("article","macro"), head = element("div","macro-head"), title = element("div","macro-title");
  const count = element("small"), badge = element("span","badge"), button = element("button","play");
  const icon = document.createElementNS("http://www.w3.org/2000/svg","svg");
  icon.setAttribute("aria-hidden","true");
  icon.setAttribute("width","17");
  icon.setAttribute("height","17");
  const shape = document.createElementNS("http://www.w3.org/2000/svg","use");
  shape.setAttribute("href","/assets/controls.svg#play");
  icon.append(shape);
  button.append(icon, document.createTextNode(english ? " Run" : " Executar"));
  badge.hidden = true;
  button.type = "button";
  button.onclick = () => command("run",name);
  title.append(element("h2",null,name),count,badge);
  head.append(title,button);
  const details = element("details"), summary = element("summary"), list = element("ul","step-list");
  details.append(summary,list);
  card.append(head,details);
  return {card,button,count,badge,summary,list,layout:null,rows:[]};
}
function filterCards() {
  const query = fold(byId("search").value.trim());
  let visible = 0;
  for (const [name,card] of cards) {
    card.card.hidden = !fold(name).includes(query);
    if (!card.card.hidden) visible++;
  }
  byId("empty").hidden = visible > 0;
  writeText(byId("empty"), cards.size ? t("Nenhum macro encontrado.") : t("Nenhum macro disponível."));
}
function renderDeck() {
  const deck = byId("deck");
  const catalog = state.steps || {};
  const live = new Map((state.run?.steps || []).map(step => [step.path,step]));
  const names = new Set(state.macros);
  for (const [name,view] of cards) {
    if (!names.has(name)) { view.card.remove(); cards.delete(name); }
  }
  state.macros.forEach((name,index) => {
    const steps = Object.hasOwn(catalog,name) ? catalog[name] : [];
    const view = cards.get(name) || makeCard(name);
    cards.set(name,view);
    const at = deck.children[index];
    if (at !== view.card) deck.insertBefore(view.card,at || null);
    const active = state.busy && (state.run?.name || state.active) === name;
    view.card.classList.toggle("is-active",active);
    view.badge.hidden = !active;
    view.badge.dataset.state = state.run?.status || "running";
    writeText(view.badge, (Object.hasOwn(labels,state.run?.status) ? labels[state.run.status] : t("Em execução")));
    const count = steps.length + (steps.length === 1 ? t(" ação") : t(" ações"));
    writeText(view.count,count);
    writeText(view.summary,t("Ver ações"));
    setDisabled(view.button,!connected || sending || Boolean(pending) || state.busy || state.pending || !steps.length);
    const layout = JSON.stringify(steps.map(step => [step.path,step.label,step.depth]));
    if (layout !== view.layout) {
      view.layout = layout;
      view.rows = steps.map(stepRow);
      view.list.replaceChildren(...view.rows.map(row => row.item));
    }
    steps.forEach((step,index) => {
      const metric = state.run?.name === name ? live.get(step.path) : null;
      showMetric(view.rows[index],metric?.label === step.label ? metric : step);
    });
  });
  filterCards();
}
function render() {
  byId("dashboard").hidden = !state;
  byId("conectar").hidden = Boolean(state);
  byId("live-deck").hidden = !state;
  byId("deck-cta").href = state ? "#live-deck" : "#conectar";
  writeText(byId("deck-cta"),state ? t("Ver painel de operação") : t("Conectar ao meu computador"));
  if (!state) return;
  writeText(byId("computer-name"), typeof state.pc_name === "string" && state.pc_name.trim() ? state.pc_name : t("Computador"));
  byId("live-deck").dataset.theme = state.appearance === "light" ? "light" : "dark";
  byId("connection").dataset.status = connected ? "online" : "offline";
  writeText(byId("connection"),connected ? t("Conectado ao computador") :
    failures < 3 ? t("Reconectando · Dados desatualizados") : t("Conexão indisponível · Dados desatualizados"));
  writeText(byId("message"),pending ? t("Comando enviado") : feedback || state.message || (state.busy ? "" : t("Pronto para executar")));
  const notice = pending ? t("Comando enviado") : feedback;
  if (notice !== lastNotice) {
    lastNotice = notice;
    clearTimeout(noticeTimer);
    byId("message").dataset.notice = String(Boolean(notice));
    if (notice) noticeTimer = setTimeout(() => { byId("message").dataset.notice = "false"; }, 4200);
  }
  renderRun();
  renderDeck();
}
function updatePending(previous) {
  if (!pending) return;
  if (pending.action === "run" && (
    (state.busy && (state.run?.name || state.active) === pending.name) ||
    (state.run?.name === pending.name && JSON.stringify(state.run) !== pending.baseline)
  )) {
    pending = null;
  } else if (pending.action === "stop" && !state.busy && !state.pending) {
    pending = null;
  } else if (!state.busy && !state.pending && state.message && state.message !== previous?.message) {
    feedback = state.message;
    pending = null;
  } else if (performance.now() >= pending.expires) {
    feedback = t("O computador ainda não confirmou o comando.");
    pending = null;
  }
}
async function command(action,name) {
  if (!connected || sending || !state) return;
  if (action === "run" && (pending || state.busy || state.pending)) return;
  if (action === "stop" && (!(state.busy || state.pending) || pending?.action === "stop")) return;
  sending = true;
  feedback = "";
  const baseline = JSON.stringify(state.run);
  render();
  try {
    await request("/api/command",{action,name});
    pending = {action,name,baseline,expires:performance.now()+8000};
  } catch (error) {
    feedback = error.status ? error.message : t("Não foi possível confirmar o envio do comando.");
    if (!error.status) {
      connected = false;
      failures++;
    }
  } finally {
    sending = false;
    render();
    refresh();
  }
}
async function refresh() {
  if (!code || refreshing || sending) return;
  const firstConnection = !state;
  const currentSession = session;
  refreshing = true;
  try {
    const previous = state;
    const snapshot = await request("/api/state");
    if (currentSession !== session) return;
    state = snapshot;
    connected = true;
    failures = 0;
    updatePending(previous);
    writeText(byId("pair-message"),"");
  } catch (error) {
    if (currentSession !== session) return;
    connected = false;
    failures++;
    if (error.status === 401 || error.status === 429) {
      code = "";
      state = null;
      pending = null;
      feedback = "";
      stopPinned = false;
      document.body.classList.remove("has-stop");
      writeText(byId("pair-message"),error.message);
    } else if (!state) {
      code = "";
      writeText(byId("pair-message"),t("Conexão indisponível. Confira o IP, o domínio autorizado no app e a permissão de rede local do navegador."));
    }
  } finally {
    refreshing = false;
    render();
    byId("pair-button").disabled = false;
    if (firstConnection && connected) byId("connection").focus();
  }
}
byId("connect").onsubmit = event => {
  event.preventDefault();
  if (refreshing) return;
  origin = localPanelAddress(byId("address").value);
  if (!origin) {
    byId("address").setAttribute("aria-invalid","true");
    writeText(byId("pair-message"),t("Informe o endereço IPv4 local e a porta que aparecem no app."));
    byId("address").focus();
    return;
  }
  code = byId("code").value.trim();
  if (!/^[0-9]{6}$/.test(code)) return;
  byId("code").value = "";
  byId("pair-button").disabled = true;
  writeText(byId("pair-message"),t("Conectando…"));
  refresh();
};
byId("search").oninput = filterCards;
byId("stop").onclick = () => command("stop");
byId("address").oninput = () => byId("address").removeAttribute("aria-invalid");
writeText(byId("site-origin"), location.origin);
byId("disconnect").onclick = () => {
  if (sending) return;
  session++;
  origin = code = feedback = "";
  connected = stopPinned = runWasActive = false;
  state = pending = null;
  runLayout = "";
  cards.clear();
  byId("deck").replaceChildren();
  byId("run-steps").replaceChildren();
  byId("run-details").open = false;
  byId("search").value = "";
  document.body.classList.remove("has-stop");
  render();
  byId("address").focus();
};
byId("connect").hidden = false;
setInterval(() => { if (code && !document.hidden) refresh(); },900);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
