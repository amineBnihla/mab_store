import { services } from "@/lib/catalog";

export function Services() {
  return (
    <section aria-label="Client services" className="section container-page">
      <ul className="grid gap-10 text-center md:grid-cols-3 md:gap-6">
        {services.map((service) => (
          <li key={service.title} className="space-y-2">
            <h3 className="text-nav">{service.title}</h3>
            <p className="mx-auto max-w-xs text-xs text-muted-foreground">{service.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
