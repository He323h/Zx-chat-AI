import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => setLocation("/settings")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="font-semibold text-foreground text-base">Terms of Service</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-5 text-sm text-foreground leading-relaxed">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Last updated: June 2025</p>
            <p className="text-muted-foreground text-xs">
              By using English Tutor - AI Powered ("the app"), you agree to these Terms of Service. Please read them carefully.
            </p>
          </div>

          <Section title="1. Acceptance of Terms">
            <p className="text-muted-foreground">
              By creating an account or using the app, you confirm that you are at least 13 years old and agree to be bound by these Terms of Service. If you do not agree, please do not use the app.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p className="text-muted-foreground">
              English Tutor - AI Powered provides an AI-powered English language learning experience, including topic-based AI chat tutoring, voice practice, vocabulary building, and anonymous partner matching for conversation practice.
            </p>
          </Section>

          <Section title="3. Acceptable Use">
            <p className="text-muted-foreground mb-2">You agree not to use the app to:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Harass, bully, or intimidate other users.</li>
              <li>Share offensive, explicit, or illegal content.</li>
              <li>Attempt to hack, disrupt, or reverse-engineer the service.</li>
              <li>Use the app for commercial spam or advertising purposes.</li>
              <li>Impersonate other users or misrepresent your identity.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </Section>

          <Section title="4. AI Responses — No Guarantee of Accuracy">
            <p className="text-muted-foreground">
              AI-generated responses are for educational and practice purposes only. English Tutor - AI Powered does not guarantee the accuracy, completeness, or correctness of any AI-generated content. You should not rely solely on the app for formal language certification or professional communication.
            </p>
          </Section>

          <Section title="5. Subscription & Payments">
            <p className="text-muted-foreground">
              English Tutor - AI Powered currently offers a free 3-day trial with full access. Paid subscription plans (Basic, Pro) are <strong className="text-foreground">coming soon</strong>. When paid plans launch:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li>Subscriptions will be charged on a monthly basis.</li>
              <li>Refunds will be considered on a case-by-case basis within 7 days of purchase.</li>
              <li>Cancellation takes effect at the end of the current billing period.</li>
            </ul>
          </Section>

          <Section title="6. User Content">
            <p className="text-muted-foreground">
              Chat messages sent through the AI tutor or the "Chat with a Stranger" feature are used solely to provide the service. Stranger chat messages are deleted at the end of each session. You retain ownership of any content you provide; by using the service you grant us a limited licence to process it to deliver the app's functionality.
            </p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p className="text-muted-foreground">
              English Tutor - AI Powered is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the app, including but not limited to loss of data or service interruptions.
            </p>
          </Section>

          <Section title="8. Age Requirement">
            <p className="text-muted-foreground">
              You must be at least 13 years old to use English Tutor - AI Powered. Users under 18 should have parental or guardian consent.
            </p>
          </Section>

          <Section title="9. Changes to Terms">
            <p className="text-muted-foreground">
              We may update these Terms from time to time. We will notify users of material changes. Continued use of the app after changes are posted constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="10. Contact">
            <p className="text-muted-foreground">
              For questions about these Terms, contact us at:{" "}
              <span className="font-medium text-foreground">kulhadahemant20@gmail.com</span>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-foreground mb-1.5">{title}</p>
      {children}
    </div>
  );
}
