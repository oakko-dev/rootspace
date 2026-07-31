export default function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="border-b border-border pb-5">
      <p className="font-mono text-xs font-bold uppercase text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}
