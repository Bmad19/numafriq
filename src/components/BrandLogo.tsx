/**
 * Blason Afrilex (PNG). Masque circulaire ; le visuel est réduit et centré dans le cercle
 * pour laisser un intervalle régulier (haut / bas / côtés) avant découpe.
 */
type BrandLogoProps = {
  variant?: "header" | "footer" | "auth";
  suppressTextForA11y?: boolean;
  className?: string;
};

const BRAND_LOGO_PNG = `${import.meta.env.BASE_URL}afrilex-logo.png`;
export { BRAND_LOGO_PNG };

const LOGO = BRAND_LOGO_PNG;

/** Part du diamètre occupée par l’image (plus petit = plus de marge dans le cercle). */
const IMG_INSET = "h-[72%] w-[72%] shrink-0 rounded-full object-cover object-center select-none";

export function BrandLogo({ variant = "header", suppressTextForA11y = false, className = "" }: BrandLogoProps) {
  const cfg =
    variant === "header"
      ? {
          wrap: "inline-flex min-w-0 items-center",
          box: "h-[4rem] w-[4rem] sm:h-[4.5rem] sm:w-[4.5rem]",
        }
      : variant === "footer"
        ? {
            wrap: "inline-flex min-w-0 items-center",
            box: "h-[4.75rem] w-[4.75rem] sm:h-[5.5rem] sm:w-[5.5rem]",
          }
        : {
            wrap: "mx-auto inline-flex min-w-0 items-center justify-center",
            box: "h-[7rem] w-[7rem] sm:h-[8rem] sm:w-[8rem]",
          };

  return (
    <span
      className={`brand-logo ${cfg.wrap} ${className}`.trim()}
      {...(suppressTextForA11y ? { "aria-hidden": true } : {})}
    >
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${cfg.box}`}
      >
        <img
          src={LOGO}
          alt={suppressTextForA11y ? "" : "Afrilex conseil"}
          className={IMG_INSET}
          width={400}
          height={400}
          draggable={false}
          decoding="async"
        />
      </span>
    </span>
  );
}
