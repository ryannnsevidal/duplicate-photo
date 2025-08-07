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

interface WelcomeEmailProps {
  userEmail: string
  userName: string
  loginUrl: string
}

export const WelcomeEmail = ({
  userEmail,
  userName,
  loginUrl,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Pix Dupe Detect - Your Enterprise File Management Solution</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔍 Welcome to Pix Dupe Detect!</Heading>
        
        <Text style={text}>
          Hi {userName},
        </Text>
        
        <Text style={text}>
          Welcome to Pix Dupe Detect, your enterprise-grade file deduplication platform! 
          Your account has been successfully created and is ready to use.
        </Text>

        <Section style={section}>
          <Text style={text}>
            <strong>What you can do with Pix Dupe Detect:</strong>
          </Text>
          <Text style={features}>
            ✅ Upload and analyze files for duplicates<br/>
            ✅ AI-powered duplicate detection<br/>
            ✅ Secure cloud storage integration<br/>
            ✅ Real-time monitoring and analytics<br/>
            ✅ Enterprise-grade security
          </Text>
        </Section>

        <Section style={buttonContainer}>
          <Button style={button} href={loginUrl}>
            Access Your Dashboard
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          <strong>Your Account Details:</strong><br/>
          Email: {userEmail}<br/>
          Account Type: User<br/>
          Created: {new Date().toLocaleDateString()}
        </Text>

        <Text style={footer}>
          If you didn't create this account, please contact our support team immediately.
        </Text>

        <Text style={signature}>
          Best regards,<br/>
          The Pix Dupe Detect Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

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

const section = {
  padding: '24px',
  border: 'solid 1px #dedede',
  borderRadius: '5px',
  textAlign: 'center' as const,
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

const features = {
  color: '#333',
  fontSize: '14px',
  margin: '16px 0',
  textAlign: 'left' as const,
  lineHeight: '24px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0f172a',
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