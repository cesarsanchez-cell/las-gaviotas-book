// UserMenu.jsx — avatar + hamburger menu, login/registro. Estilo Airbnb:
// botón redondeado con icono menú + icono usuario; click abre dropdown.
const { useState: useStateUM, useRef: useRefUM, useEffect: useEffectUM } = React;

function UserMenu() {
  const [open, setOpen] = useStateUM(false);
  const [authed, setAuthed] = useStateUM(false); // mock state — en prod viene de session
  const wrapRef = useRefUM(null);

  useEffectUM(() => {
    if (!open) return;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="me-um" ref={wrapRef}>
      <button
        type="button"
        className="me-um__btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menú de usuario"
      >
        <Icon name="menu" size={16} />
        <span className="me-um__avatar" aria-hidden>
          {authed ? <span className="me-um__initial">M</span> : <Icon name="user" size={20} />}
        </span>
      </button>

      {open && (
        <div className="me-um__pop" role="menu">
          {!authed ? (
            <>
              <button type="button" className="me-um__item me-um__item--bold" role="menuitem"
                      onClick={() => { setAuthed(true); setOpen(false); }}>
                Registrarse
              </button>
              <button type="button" className="me-um__item" role="menuitem"
                      onClick={() => { setAuthed(true); setOpen(false); }}>
                Iniciar sesión
              </button>
              <div className="me-um__sep" />
              <a className="me-um__item" href="#" role="menuitem">Sumar mi propuesta</a>
              <a className="me-um__item" href="#" role="menuitem">Ayuda</a>
            </>
          ) : (
            <>
              <a className="me-um__item me-um__item--bold" href="#" role="menuitem">Mis escapadas</a>
              <a className="me-um__item" href="#" role="menuitem">Favoritos</a>
              <a className="me-um__item" href="#" role="menuitem">Mensajes</a>
              <div className="me-um__sep" />
              <a className="me-um__item" href="#" role="menuitem">Mi perfil</a>
              <a className="me-um__item" href="#" role="menuitem">Sumar mi propuesta</a>
              <a className="me-um__item" href="#" role="menuitem">Ayuda</a>
              <div className="me-um__sep" />
              <button type="button" className="me-um__item" role="menuitem"
                      onClick={() => { setAuthed(false); setOpen(false); }}>
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

window.UserMenu = UserMenu;
