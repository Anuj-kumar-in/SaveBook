import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header
      className={clsx('hero hero--primary', styles.heroBanner)}
    >
      <div className="container">
        <Heading as="h1" className="hero__title">
          📚 SaveBook Documentation
        </Heading>

        <p className="hero__subtitle">
          Complete developer and user guide for SaveBook
        </p>

        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
            Explore Documentation 🚀
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={`SaveBook Docs`}
      description="Official documentation website for SaveBook"
    >
      <HomepageHeader />

      <main
        style={{
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        <h2>Why SaveBook?</h2>

        <p
          style={{
            maxWidth: "700px",
            margin: "20px auto",
            fontSize: "18px",
            lineHeight: "1.7",
          }}
        >
          SaveBook helps users organize, manage, and save books
          efficiently with a modern UI, authentication system,
          responsive design, and seamless user experience.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginTop: "50px",
          }}
        >
          <div className="card padding--lg">
            <h3>📘 Developer Guide</h3>
            <p>Easy setup and contribution workflow.</p>
          </div>

          <div className="card padding--lg">
            <h3>⚡ Fast Setup</h3>
            <p>Quick installation and deployment process.</p>
          </div>

          <div className="card padding--lg">
            <h3>🌙 Dark Mode</h3>
            <p>Built-in dark mode for better reading experience.</p>
          </div>
        </div>
      </main>
    </Layout>
  );
}