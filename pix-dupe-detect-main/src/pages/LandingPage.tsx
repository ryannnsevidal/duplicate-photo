import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Shield, Cloud, Zap, CheckCircle, Users, Play, Chrome, Smartphone, Globe, Database, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export function LandingPage() {
  const authProviders = [
    {
      icon: <Chrome className="h-5 w-5" />,
      name: "Google",
      description: "Sign in with Google Account",
      badge: "Web & Android"
    }
  ];

  const features = [
    {
      icon: <Upload className="h-8 w-8 text-primary" />,
      title: "Smart Upload",
      description: "Drag & drop images and documents with automatic format detection",
      details: "Supports PDF, JPEG, PNG, HEIC with intelligent file type detection"
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "AI-Powered Detection", 
      description: "Advanced perceptual hashing and content analysis for 99.9% accuracy",
      details: "SHA256 + perceptual hashing for images, structural analysis for PDFs"
    },
    {
      icon: <Cloud className="h-8 w-8 text-primary" />,
      title: "Multi-Cloud Sync",
      description: "Seamless integration with Google Photos, Apple Photos, and cloud storage",
      details: "Secure Rclone integration with 40+ cloud providers"
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Enterprise Security",
      description: "Bank-grade encryption with comprehensive audit trails",
      details: "JWT tokens, RLS policies, rate limiting, IP reputation tracking"
    }
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 sticky top-0 bg-background/80 backdrop-blur-sm border-b z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              PixDupe Pro
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="hidden md:inline-flex">
              <Lock className="h-3 w-3 mr-1" />
              Production Ready
            </Badge>
            <Link to="/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signin">
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                Live Demo
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="container mx-auto px-4 py-20 text-center"
      >
        <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
          <Globe className="h-3 w-3 mr-1" />
          Enterprise-Grade Deduplication System
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent leading-tight">
          Intelligent File
          <br />
          Deduplication
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Production-ready AI system that eliminates duplicate images and documents 
          across multiple platforms with enterprise security and multi-cloud integration.
        </p>

        {/* Auth Provider Showcase */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          {authProviders.map((provider, index) => (
            <Card key={index} className="p-4 hover:shadow-lg transition-all cursor-pointer border-primary/20">
              <div className="flex items-center gap-3">
                {provider.icon}
                <div className="text-left">
                  <div className="font-semibold">Continue with {provider.name}</div>
                  <div className="text-sm text-muted-foreground">{provider.description}</div>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {provider.badge}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/signin">
            <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              <Play className="h-5 w-5 mr-2" />
              Start Live Demo
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-primary/20 hover:bg-primary/5">
            View Documentation
          </Button>
        </div>
      </motion.section>


      {/* Features Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="container mx-auto px-4 py-20"
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Production-Ready Features
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enterprise security, multi-platform support, and advanced AI capabilities
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-all border-primary/10">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.details}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="container mx-auto px-4 py-20"
      >
        <Card className="text-center py-16 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
          <CardContent>
            <Badge className="mb-6 bg-primary/20 text-primary border-primary/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready for Production
            </Badge>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Experience the Demo Now
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              See how our enterprise-grade deduplication system works with real files, 
              live authentication, and cloud integrations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signin">
                <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                  <Users className="h-5 w-5 mr-2" />
                  Start Interactive Demo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}