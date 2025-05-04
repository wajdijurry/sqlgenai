import React from 'react';
import { Container, Typography, Box, Paper, Divider, Link } from '@mui/material';

const TermsOfServicePage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Terms of Service
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Last updated: April 14, 2025
        </Typography>
        
        <Paper elevation={2} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            1. Acceptance of Terms
          </Typography>
          <Typography paragraph>
            Welcome to SQLGenAI. By accessing or using our service, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our service.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            2. Description of Service
          </Typography>
          <Typography paragraph>
            SQLGenAI provides an AI-powered SQL query generation service that allows users to generate SQL queries from natural language prompts. Our service enables users to connect to their databases, ask questions in plain English, and receive SQL queries that can be executed against their databases.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            3. User Accounts
          </Typography>
          <Typography paragraph>
            To use certain features of our service, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
          </Typography>
          <ul>
            <li>
              <Typography paragraph>
                Provide accurate and complete information when creating your account
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Update your information as necessary to keep it current
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Notify us immediately of any unauthorized access to or use of your account
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Ensure that you exit from your account at the end of each session
              </Typography>
            </li>
          </ul>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            4. Subscription and Payment
          </Typography>
          <Typography paragraph>
            SQLGenAI offers various subscription plans with different features and limitations. By subscribing to a paid plan, you agree to pay the applicable fees as described on our pricing page. We reserve the right to change our prices with reasonable notice.
          </Typography>
          <Typography paragraph>
            Subscription fees are billed in advance on a monthly or annual basis, depending on the plan you select. You authorize us to charge your payment method for all fees incurred.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            5. User Responsibilities
          </Typography>
          <Typography paragraph>
            When using our service, you agree to:
          </Typography>
          <ul>
            <li>
              <Typography paragraph>
                Use the service in compliance with all applicable laws and regulations
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Not use the service for any illegal or unauthorized purpose
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Not attempt to gain unauthorized access to any part of the service
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Not interfere with or disrupt the integrity or performance of the service
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Not reproduce, duplicate, copy, sell, resell, or exploit any portion of the service without our express written permission
              </Typography>
            </li>
          </ul>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            6. Data Security and Privacy
          </Typography>
          <Typography paragraph>
            We take data security seriously. While we implement appropriate security measures to protect your data, you are responsible for:
          </Typography>
          <ul>
            <li>
              <Typography paragraph>
                Ensuring that your database connections are properly secured
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Using appropriate access controls for your account
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Reviewing generated SQL queries before execution to ensure they meet your requirements and security standards
              </Typography>
            </li>
          </ul>
          <Typography paragraph>
            Please refer to our Privacy Policy for information on how we collect, use, and protect your data.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            7. Intellectual Property
          </Typography>
          <Typography paragraph>
            The service and its original content, features, and functionality are owned by SQLGenAI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </Typography>
          <Typography paragraph>
            You retain ownership of your data, including database schemas, queries, and results. However, you grant us a non-exclusive, worldwide, royalty-free license to use, store, and process your data solely for the purpose of providing and improving our service.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            8. Limitation of Liability
          </Typography>
          <Typography paragraph>
            To the maximum extent permitted by law, SQLGenAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to, damages for loss of profits, goodwill, use, data, or other intangible losses, resulting from:
          </Typography>
          <ul>
            <li>
              <Typography paragraph>
                Your use or inability to use the service
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Any changes made to the service
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Unauthorized access to or alteration of your data
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                The execution of SQL queries generated by our service
              </Typography>
            </li>
          </ul>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            9. Disclaimer of Warranties
          </Typography>
          <Typography paragraph>
            The service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, timely, secure, or error-free.
          </Typography>
          <Typography paragraph>
            While our AI aims to generate accurate SQL queries, we do not guarantee that the generated queries will be error-free or meet your specific requirements. You are responsible for reviewing and testing all generated queries before execution.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            10. Termination
          </Typography>
          <Typography paragraph>
            We may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason, including but not limited to a breach of these Terms.
          </Typography>
          <Typography paragraph>
            Upon termination, your right to use the service will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            11. Changes to Terms
          </Typography>
          <Typography paragraph>
            We reserve the right to modify or replace these Terms at any time. We will provide notice of any material changes by posting the updated Terms on our website or by sending you an email. Your continued use of the service after any such changes constitutes your acceptance of the new Terms.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            12. Governing Law
          </Typography>
          <Typography paragraph>
            These Terms shall be governed by and construed in accordance with the laws of Jordan, without regard to its conflict of law provisions.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            13. Contact Us
          </Typography>
          <Typography paragraph>
            If you have any questions about these Terms, please contact us at:
          </Typography>
          <Typography paragraph>
            <strong>Email:</strong> <Link href="mailto:legal@sqlgenai.com">legal@sqlgenai.com</Link>
          </Typography>
          <Typography paragraph>
            <strong>Phone:</strong> <Link href="tel:+962795845634">+962 (79) 584-5634</Link>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default TermsOfServicePage;
