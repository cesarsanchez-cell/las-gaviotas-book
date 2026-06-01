// Section.jsx — pattern eyebrow + display title + subtitle + content.
function Section({ id, tone = "default", eyebrowIcon, eyebrow, title, subtitle, link, dark, children }) {
  const cls = ["me-section", `me-section--${tone}`, dark && "me-section--dark"].filter(Boolean).join(" ");
  return (
    <section id={id} className={cls}>
      <div className="me-container">
        <header className="me-section__head">
          <div className="me-section__lead">
            <p className={`me-eyebrow ${dark ? "me-eyebrow--on-dark" : ""}`}>
              {eyebrowIcon && <Icon name={eyebrowIcon} size={14} />}
              {eyebrow}
            </p>
            <h2 className="me-section__title">{title}</h2>
            {subtitle && <p className="me-section__sub">{subtitle}</p>}
          </div>
          {link && (
            <a href={link.href} className="me-section__link">
              {link.label} →
            </a>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}

window.Section = Section;
