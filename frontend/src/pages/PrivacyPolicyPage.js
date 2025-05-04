import React from 'react';
import { Container, Typography, Box, Paper, Divider, Link } from '@mui/material';

const PrivacyPolicyPage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Privacy Policy
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Last updated: April 14, 2025
        </Typography>
        
        <Paper elevation={2} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            1. Introduction
          </Typography>
          <Typography paragraph>
            Welcome to SQLGenAI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our SQL query generation service.
          </Typography>
          <Typography paragraph>
            By accessing or using SQLGenAI, you agree to the terms of this Privacy Policy. If you do not agree with our policies and practices, please do not use our service.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            2. Information We Collect
          </Typography>
          <Typography variant="h6" gutterBottom>
            2.1 Personal Information
          </Typography>
          <Typography paragraph>
            We may collect personal information that you voluntarily provide to us when you:
          </Typography>
          <ul>
            <li>
              <Typography paragraph>
                Register for an account (name, email address, company name, job title)
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Connect to your databases (connection credentials, which are encrypted)
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Generate SQL queries (natural language prompts, database schema information)
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Contact our support team
              </Typography>
            </li>
          </ul>
          
          <Typography variant="h6" gutterBottom>
            2.2 Usage Information
          </Typography>
          <Typography paragraph>
            We automatically collect certain information about your device and how you interact with our service, including:
          </Typography>
          <ul>
            <li>
              <Typography paragraph>
                IP address and browser information
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Pages you view and features you use
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Query history and database connection information
              </Typography>
            </li>
          </ul>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            3. How We Use Your Information
          </Typography>
          <Typography paragraph>
            We use the information we collect to:
          </Typography>
          <ul>
            <li>
              <Typography paragraph>
                Provide, maintain, and improve our service
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Process and complete transactions
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Send you technical notices, updates, and support messages
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Monitor and analyze usage patterns and trends
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Enhance the security of our service
              </Typography>
            </li>
          </ul>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            4. Data Security
          </Typography>
          <Typography paragraph>
            We implement appropriate technical and organizational measures to protect your personal information. Database credentials are encrypted, and we use industry-standard security protocols to safeguard your data.
          </Typography>
          <Typography paragraph>
            However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            5. Data Retention
          </Typography>
          <Typography paragraph>
            We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            6. Your Rights
          </Typography>
          <Typography paragraph>
            Depending on your location, you may have certain rights regarding your personal information, including:
          </Typography>
          <ul>
            <li>
              <Typography paragraph>
                The right to access and receive a copy of your personal information
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                The right to correct or update your personal information
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                The right to request deletion of your personal information
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                The right to restrict or object to processing of your personal information
              </Typography>
            </li>
          </ul>
          <Typography paragraph>
            To exercise these rights, please contact us at <Link href="mailto:privacy@sqlgenai.com">privacy@sqlgenai.com</Link>.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            7. Changes to This Privacy Policy
          </Typography>
          <Typography paragraph>
            We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last updated" date. We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            8. Contact Us
          </Typography>
          <Typography paragraph>
            If you have any questions or concerns about this Privacy Policy, please contact us at:
          </Typography>
          <Typography paragraph>
            <strong>Email:</strong> <Link href="mailto:privacy@sqlgenai.com">privacy@sqlgenai.com</Link>
          </Typography>
          <Typography paragraph>
            <strong>Phone:</strong> <Link href="tel:+962795845634">+962 (79) 584-5634</Link>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default PrivacyPolicyPage;
