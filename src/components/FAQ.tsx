'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'General',
    question: '¿Qué es TecRural?',
    answer: 'TecRural es una herramienta digital que ofrece información local de clima y recomendaciones de riego orientativo para agricultores del Altiplano de Granada y la Costa Tropical. Te ayuda a tomar mejores decisiones para cuidar tu cultivo.'
  },
  {
    category: 'General',
    question: '¿Es gratuito?',
    answer: 'La consulta básica de clima y riego orientativo es gratuita. También ofrecemos planes de suscripción con servicios adicionales como avisos personalizados por WhatsApp, instalación de sensores y estaciones meteorológicas.'
  },
  {
    category: 'Uso',
    question: '¿Cómo funciona?',
    answer: 'Selecciona tu zona y municipio, elige tu cultivo (opcional) y consulta el tiempo. El sistema combina datos oficiales de AEMET con modelos meteorológicos de Open-Meteo para ofrecerte información precisa y actualizada.'
  },
  {
    category: 'Uso',
    question: '¿Qué cultivos cubrís?',
    answer: 'Actualmente cubrimos olivar, almendro, pistacho, hortícolas, aguacate, chirimoyo, mango, viñedo y otros cultivos habituales de la zona. Si tu cultivo no está en la lista, puedes seleccionar "otros".'
  },
  {
    category: 'Datos',
    question: '¿Qué fuentes de datos utilizáis?',
    answer: 'Utilizamos una estrategia híbrida: AEMET (Agencia Estatal de Meteorología) para las condiciones actuales y previsión de hoy, y Open-Meteo para la tendencia de los próximos días. Si alguna fuente no está disponible, mostramos datos orientativos.'
  },
  {
    category: 'Datos',
    question: '¿Qué tan precisos son los datos?',
    answer: 'Nuestros datos son muy precisos porque usamos fuentes oficiales. Sin embargo, las recomendaciones de riego son orientativas y siempre debes contrastarlas con la situación real de tu finca, tipo de suelo y estado del cultivo.'
  },
  {
    category: 'Riego',
    question: '¿Cómo calculáis la recomendación de riego?',
    answer: 'Calculamos la evapotranspiración (ET0 FAO-56) usando datos meteorológicos, la ajustamos según el coeficiente de cultivo (Kc) por etapa fenológica, restamos la lluvia prevista y te sugerimos las mejores horas para regar según el clima.'
  },
  {
    category: 'Riego',
    question: '¿Qué significa la "fase fenológica"?',
    answer: 'La fase fenológica es la etapa de desarrollo del cultivo (brotación, floración, cuajado, engorde, maduración). Cada fase tiene necesidades de agua diferentes. Nuestro sistema estima la fase probable según la fecha y la zona, pero puedes corregirla manualmente.'
  },
  {
    category: 'Tecnología',
    question: '¿Necesito instalar una aplicación?',
    answer: 'No, TecRural funciona directamente en tu navegador. Además es una PWA (Progressive Web App), lo que significa que puedes "instalarla" en tu móvil para acceder más rápido, sin ocupar mucho espacio.'
  },
  {
    category: 'Tecnología',
    question: '¿Funciona sin internet?',
    answer: 'TecRural necesita conexión a internet para obtener los datos meteorológicos actualizados. Sin embargo, como PWA guarda algunos recursos en caché, puede funcionar parcialmente si pierdes conexión temporalmente.'
  },
  {
    category: 'Servicios',
    question: '¿Qué ofrecéis además de la consulta gratuita?',
    answer: 'Ofrecemos planes de suscripción que incluyen avisos agrícolas por WhatsApp, seguimiento personalizado de parcelas, instalación de sensores de humedad del suelo, estaciones meteorológicas locales, informes agroclimáticos y diagnóstico de plantas por imagen.'
  },
  {
    category: 'Servicios',
    question: '¿Cómo contrato los servicios de pago?',
    answer: 'Puedes contactarnos a través del formulario de contacto o directamente por WhatsApp. Te haremos un presupuesto personalizado según tus necesidades (tamaño de finca, cultivos, servicios requeridos).'
  }
];

const CATEGORIES = Array.from(new Set(FAQ_DATA.map(item => item.category)));

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQs = activeCategory === 'Todas'
    ? FAQ_DATA
    : FAQ_DATA.filter(item => item.category === activeCategory);

  return (
    <section id="faq" className="section">
      <div className="container">
        <div className="section-head">
          <h2>Preguntas frecuentes</h2>
          <p>
            Respuestas a las dudas más comunes sobre TecRural, nuestros servicios
            y cómo te ayudamos a cuidar mejor tu cultivo.
          </p>
        </div>

        <div className="faq-filters">
          <button
            className={`faq-filter ${activeCategory === 'Todas' ? 'active' : ''}`}
            onClick={() => setActiveCategory('Todas')}
          >
            Todas
          </button>
          {CATEGORIES.map(category => (
            <button
              key={category}
              className={`faq-filter ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="faq-list">
          {filteredFAQs.map((item, index) => {
            const globalIndex = FAQ_DATA.indexOf(item);
            const isOpen = openItems.has(globalIndex);

            return (
              <div
                key={globalIndex}
                className={`faq-item ${isOpen ? 'open' : ''}`}
              >
                <button
                  className="faq-question"
                  onClick={() => toggleItem(globalIndex)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${globalIndex}`}
                >
                  <span className="faq-category-badge">{item.category}</span>
                  <span className="faq-question-text">{item.question}</span>
                  <span className="faq-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {isOpen ? (
                        <>
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </>
                      ) : (
                        <>
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </>
                      )}
                    </svg>
                  </span>
                </button>
                <div
                  id={`faq-answer-${globalIndex}`}
                  className="faq-answer"
                  aria-hidden={!isOpen}
                >
                  <p>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="faq-contact">
          <p>¿No encuentras la respuesta que buscas?</p>
          <a
            href="#contacto"
            className="btn btn-primary"
          >
            Contactar con TecRural
          </a>
        </div>
      </div>
    </section>
  );
}