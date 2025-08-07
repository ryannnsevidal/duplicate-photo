import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PasswordResetEmailProps {
  userEmail: string
  resetUrl: string
  expiryTime: string
}

export const PasswordResetEmail = ({
  userEmail,
  resetUrl,
  expiryTime,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Pix Dupe Detect password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔐 Password Reset Request</Heading>
        
        <Text style={text}>
          You requested a password reset for your Pix Dupe Detect account.
        </Text>
        
        <Text style={text}>
          <strong>Account:</strong> {userEmail}
        </Text>

        <Section style={warningSection}>
          <Text style={warningText}>
            ⚠️ This link will expire in {expiryTime}
          </Text>
        </Section>

        <Section style={buttonContainer}>
          <Button style={button} href={resetUrl}>
            Reset Your Password
          </Button>
        </Section>

        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        
        <Text style={linkText}>
          {resetUrl}
        </Text>

        <Hr style={hr} />

        <Section style={securitySection}>
          <Text style={securityTitle}>🛡️ Security Notice</Text>
          <Text style={securityText}>
            • If you didn't request this reset, please ignore this email<br/>
            • Never share this link with anyone<br/>
            • The link can only be used once<br/>
            • For security, we recommend using a strong, unique password
          </Text>
        </Section>

        <Text style={footer}>
          If you continue to have issues, contact our support team.
        </Text>

        <Text style={signature}>
          Best regards,<br/>
          The Pix Dupe Detect Security Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const warningSection = {
  padding: '16px',
  backgroundColor: '#fef3cd',
  border: 'solid 1px #fde047',
  borderRadius: '5px',
  textAlign: 'center' as const,
  margin: '24px 0',
}

const securitySection = {
  padding: '24px',
  backgroundColor: '#f8f9fa',
  border: 'solid 1px #e9ecef',
  borderRadius: '5px',
  margin: '24px 0',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '14px',
  margin: '24px 0',
  textAlign: 'left' as const,
}

const warningText = {
  color: '#d97706',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
}

const securityTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const securityText = {
  color: '#666',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
}

const linkText = {
  color: '#2563eb',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  margin: '16px 0',
  padding: '12px',
  backgroundColor: '#f8f9fa',
  border: 'solid 1px #e9ecef',
  borderRadius: '4px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '12px 24px',
  margin: '0 auto',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '32px 0',
}

const signature = {
  color: '#333',
  fontSize: '14px',
  margin: '24px 0',
  textAlign: 'left' as const,
}