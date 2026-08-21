import {
  BellIcon,
  DropletIcon,
  StationIcon,
  SensorIcon,
  CameraIcon,
  ReportIcon,
  WhatsAppIcon,
} from './icons';
import { buildWhatsAppLink, businessName, defaultWhatsAppMessage } from '@/lib/wa';

const PLANS = [
  {
    name: 'Plan Básico',
    price: '5',
    unit: '€/mes',
    featured: false,
    items: [
      'Avisos agrícolas por WhatsApp',
      'Alertas de heladas, calor y viento',
      'Información del tiempo local',
    ],
  },
  {
    name: 'Plan Parcela',
    price: '12–19',
    unit: '€/mes',
    featured: true,
    items: [
      'Todo lo del Plan Básico',
      'Seguimiento de clima y riego de tu parcela',
      'Recomendaciones de riego adaptadas',
      'Soporte por WhatsApp',
    ],
  },
  {
    name: 'Plan Profesional',
    price: '29–49',
    unit: '€/mes',
    featured: false,
    items: [
      'Todo lo del Plan Parcela',
      'Informes agroclimáticos',
      'Sensores en la finca',
      'Soporte y asesoramiento prioritario',
    ],
  },
];

const SERVICES = [
  {
    icon: BellIcon,
    title: 'Avisos agrícolas por WhatsApp',
    text: 'Alertas sencillas de heladas, calor extremo, viento fuerte o lluvia, directamente al móvil.',
    gated: false,
  },
  {
    icon: SensorIcon,
    title: 'Sensores de humedad del suelo',
    text: 'Mide la humedad en la zona de raíces y evita regar de más o de menos.',
    gated: false,
  },
  {
    icon: StationIcon,
    title: 'Estación meteorológica local',
    text: 'Datos reales de tu finca: temperatura, humedad, lluvia y viento.',
    gated: false,
  },
  {
    icon: DropletIcon,
    title: 'Recomendaciones de riego',
    text: 'Orientación basada en el clima y el estado de la parcela para ayudar a decidir.',
    gated: false,
  },
  {
    icon: CameraIcon,
    title: 'Diagnóstico de plantas por imagen',
    text: 'Fotografía el problema y te orientamos sobre posibles plagas o carencias.',
    gated: true,
  },
  {
    icon: ReportIcon,
    title: 'Informes agroclimáticos',
    text: 'Resúmenes del tiempo y del agua para entender mejor lo que pasa en tu finca.',
    gated: true,
  },
];

export default function Services() {
  const waLink = buildWhatsAppLink(defaultWhatsAppMessage());
  return (
    <section id="servicios" className="section section-alt">
      <div className="container">
        <div className="section-head">
          <h2>Servicios {businessName()}</h2>
          <p>
            Tecnología práctica para ayudarte a decidir mejor con{' '}
            <strong>información local</strong>, sin complicaciones. Los precios
            son orientativos y sin permanencia obligatoria.
          </p>
        </div>

        <div className="plans">
          {PLANS.map((plan) => (
            <div
              className={`plan${plan.featured ? ' plan-featured' : ''}`}
              key={plan.name}
            >
              <h3>{plan.name}</h3>
              <div className="plan-price">
                desde {plan.price} <small>{plan.unit}</small>
              </div>
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <a
                className={`btn ${plan.featured ? 'btn-primary' : 'btn-ghost'}`}
                href="#contacto"
              >
                Solicitar información
              </a>
            </div>
          ))}
        </div>

        <div className="section-head section-head-gap">
          <h2>Qué hacemos</h2>
          <p>Instalación de sensores o estación: presupuesto personalizado desde 180 €.</p>
        </div>

        <div className="services-list">
          {SERVICES.map((s) => (
            <div className={`service${s.gated ? ' service-gated' : ''}`} key={s.title}>
              <div className="service-icon">
                <s.icon width={20} height={20} />
              </div>
              <div>
                <h4>
                  {s.title}
                  {s.gated && <span className="gated-badge">🔒 Solo con contacto</span>}
                </h4>
                <p>{s.text}</p>
                {s.gated && (
                  <a
                    className="btn btn-wa btn-small"
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon /> Desbloquear por WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="services-cta">
          <a
            className="btn btn-wa btn-lg"
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon /> Consultar con {businessName()} por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
