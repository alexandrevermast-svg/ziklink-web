import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales & confidentialité",
  description: `Mentions légales, hébergement et politique de confidentialité de ${SITE_NAME}.`,
};

const CONTACT_EMAIL = "alexandre.vermast@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-zik-text">{title}</h2>
      <div className="text-sm text-zik-muted leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function LegalPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-zik-text">Mentions légales & confidentialité</h1>
        <p className="text-sm text-zik-muted mt-1">Dernière mise à jour : août 2026</p>
      </div>

      <Section title="Éditeur du site">
        <p>
          {SITE_NAME} ({SITE_URL}) est édité par Alexandre Vermast, personne physique agissant à
          titre non professionnel. Conformément à l&apos;article 6-III de la LCEN, les
          coordonnées complètes de l&apos;éditeur sont tenues à la disposition des autorités
          compétentes qui en feraient la demande et ne sont pas publiées sur le site.
        </p>
        <p>Contact : <a href={`mailto:${CONTACT_EMAIL}`} className="text-zik-purple hover:underline">{CONTACT_EMAIL}</a></p>
        <p>Directeur de la publication : Alexandre Vermast.</p>
      </Section>

      <Section title="Hébergement">
        <p>
          Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789,
          États-Unis — <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-zik-purple hover:underline">vercel.com</a>.
        </p>
      </Section>

      <Section title="Données personnelles">
        <p>
          {SITE_NAME} utilise Supabase (Supabase Inc.) comme base de données et système
          d&apos;authentification. Les données que vous nous confiez sont hébergées et traitées
          par Supabase pour le compte de {SITE_NAME} — voir leur{" "}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-zik-purple hover:underline">
            politique de confidentialité
          </a>.
        </p>
        <p>Selon les fonctionnalités que vous utilisez, nous collectons :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>votre email et mot de passe (ou identifiant Google), pour créer et sécuriser votre compte ;</li>
          <li>les informations de votre profil que vous renseignez (pseudo, bio, ville, instruments, photo) ;</li>
          <li>votre position géographique, uniquement si vous activez le filtre &quot;près de moi&quot;, jamais stockée ni partagée ;</li>
          <li>un abonnement technique (endpoint de notification) si vous activez les notifications push, pour pouvoir vous envoyer des alertes ;</li>
          <li>le contenu que vous publiez (jams, concerts, messages, participations).</li>
        </ul>
        <p>
          Ces données servent uniquement au fonctionnement du service : gérer votre compte,
          afficher vos jams/concerts, vous mettre en relation avec d&apos;autres musiciens et vous
          notifier des événements qui vous concernent. Elles ne sont ni vendues ni partagées à
          des fins publicitaires.
        </p>
        <p>
          Vos données sont conservées tant que votre compte est actif. Vous pouvez demander leur
          suppression à tout moment en nous contactant.
        </p>
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
          d&apos;effacement, de portabilité et d&apos;opposition sur vos données. Pour exercer ces
          droits, écrivez à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-zik-purple hover:underline">{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          {SITE_NAME} utilise uniquement des cookies techniques nécessaires à
          l&apos;authentification (gérés par Supabase). Aucun cookie publicitaire ou de
          traçage tiers n&apos;est utilisé.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Pour toute question, signalement de bug, ou demande relative à vos données :{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-zik-purple hover:underline">{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </div>
  );
}
