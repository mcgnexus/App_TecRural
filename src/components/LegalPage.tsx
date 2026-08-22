import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, children }: LegalPageProps) {
  return (
    <>
      <Header />
      <main className="legal-page">
        <div className="container legal-content">
          <p className="legal-kicker">TecRural</p>
          <h1>{title}</h1>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
