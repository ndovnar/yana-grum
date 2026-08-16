type LogoProps = { href?: string };

export function Logo({ href = "#top" }: LogoProps) {
  return (
    <a className="logo" href={href} aria-label="Yana Grum — strona główna">
      <img
        src={`${import.meta.env.BASE_URL}images/yana-grum-logo.png`}
        alt="Yana Grum"
        width="1280"
        height="426"
      />
      <small>Salon pielęgnacji psów</small>
    </a>
  );
}
