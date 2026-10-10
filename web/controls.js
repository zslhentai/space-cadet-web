// Input ownership is shared by keyboard and every pointer. Multiple fingers on
// one flipper must not release it until the last owner lifts.
export function createControls({ elements, keyboardTarget = window, send, enabled, onGesture = () => {} }) {
  const owners = new Map();
  const keys = { KeyZ: 0, ArrowLeft: 0, Slash: 1, ArrowRight: 1, Space: 2, KeyX: 3, Period: 4, ArrowUp: 5 };
  const hasAction = action => [...owners.values()].includes(action);
  function begin(owner, action) {
    if (!enabled() || owners.has(owner)) return;
    const already = hasAction(action);
    owners.set(owner, action);
    if (!already) send(action, true);
    paint();
  }
  function end(owner) {
    if (!owners.has(owner)) return;
    const action = owners.get(owner);
    owners.delete(owner);
    if (!hasAction(action)) send(action, false);
    paint();
  }
  function paint() { elements.forEach(el => el.classList.toggle('pressed', hasAction(Number(el.dataset.action)))); }
  const listeners = [];
  const listen = (target, event, callback, options) => { target.addEventListener(event, callback, options); listeners.push(() => target.removeEventListener(event, callback, options)); };
  elements.forEach(el => {
    listen(el, 'pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (!enabled()) return;
      event.preventDefault();
      onGesture();
      el.setPointerCapture(event.pointerId);
      begin(`pointer:${event.pointerId}`, Number(el.dataset.action));
    }, { passive: false });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => listen(el, type, event => {
      event.preventDefault();
      end(`pointer:${event.pointerId}`);
    }));
    listen(el, 'contextmenu', event => event.preventDefault());
  });
  listen(keyboardTarget, 'keydown', event => {
    if (event.target?.closest?.('input,textarea,select,dialog') || !enabled()) return;
    if (!(event.code in keys)) return;
    event.preventDefault();
    onGesture();
    if (!event.repeat) begin(`key:${event.code}`, keys[event.code]);
  });
  listen(keyboardTarget, 'keyup', event => {
    if (!(event.code in keys)) return;
    if (owners.has(`key:${event.code}`)) event.preventDefault();
    end(`key:${event.code}`);
  });
  return {
    releaseAll() { [...owners.keys()].forEach(end); },
    dispose() { this.releaseAll(); listeners.forEach(remove => remove()); },
  };
}
