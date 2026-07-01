import type { ResumeData } from "./types";

export const mockResume: ResumeData = {
  name: "Shankar Samidala",
  title: "Senior DevOps Engineer",
  email: "shankar.samidala@gmail.com",
  phone: "+91 90321 54876",
  location: "Hyderabad, Telangana",
  linkedin: "linkedin.com/in/shankarsamidala",
  github: "github.com/shankarsamidala",
  summary:
    "Senior DevOps Engineer with 6.5+ years of experience designing and managing scalable cloud infrastructure across AWS, Azure, and GCP. Proven expertise in CI/CD pipeline automation, Kubernetes orchestration, and Infrastructure as Code using Terraform and Ansible. Led SRE initiatives at Bazaarvoice reducing incident response time by 40%. Seeking to leverage cloud-native skills and team leadership experience in a high-growth product engineering environment.",

  skills: [
    {
      category: "Cloud Platforms",
      items: ["AWS (EC2, S3, Lambda, EKS, CloudFormation)", "Azure DevOps", "GCP (GKE, Cloud Run)"],
    },
    { category: "IaC & Configuration", items: ["Terraform", "Ansible", "CloudFormation"] },
    {
      category: "CI/CD & DevOps",
      items: ["Jenkins", "GitHub Actions", "GitLab CI", "ArgoCD", "Helm"],
    },
    {
      category: "Containers & Orchestration",
      items: ["Docker", "Kubernetes", "Docker Compose", "ECS", "Istio"],
    },
    {
      category: "Monitoring",
      items: ["Prometheus", "Grafana", "CloudWatch", "Datadog", "ELK Stack", "PagerDuty"],
    },
    { category: "Languages & Scripting", items: ["Python", "Bash", "Go", "SQL"] },
  ],

  experience: [
    {
      role: "Senior DevOps Engineer",
      company: "Bazaarvoice India Pvt Ltd",
      location: "Hyderabad",
      period: "Mar 2021 – Present",
      points: [
        "Architected and maintained CI/CD pipelines using Jenkins and GitHub Actions for 12+ microservices, reducing deployment time from 45 mins to 12 mins",
        "Managed production Kubernetes clusters (EKS) serving 50M+ API requests/day with 99.95% uptime SLA",
        "Implemented Infrastructure as Code using Terraform for multi-region AWS deployments, managing 200+ cloud resources",
        "Led incident management and SRE BAU operations, reducing MTTR from 2 hours to 45 minutes through automated runbooks",
        "Designed monitoring dashboards using Prometheus + Grafana, enabling proactive alerting that prevented 30+ potential outages",
        "Mentored a team of 3 junior DevOps engineers on cloud-native best practices and Kubernetes patterns",
      ],
    },
    {
      role: "DevOps Engineer",
      company: "Wipro Technologies",
      location: "Bengaluru",
      period: "Jul 2019 – Feb 2021",
      points: [
        "Built and maintained CI/CD pipelines for enterprise Java applications using GitLab CI and Docker",
        "Migrated 15+ legacy applications from on-premise servers to AWS ECS, reducing infrastructure costs by 35%",
        "Automated server provisioning and configuration using Ansible playbooks across 100+ EC2 instances",
        "Implemented centralized logging using ELK Stack (Elasticsearch, Logstash, Kibana) for production debugging",
        "Collaborated with 4 development teams to establish GitOps practices and branch protection strategies",
      ],
    },
    {
      role: "Systems Engineer",
      company: "Infosys Ltd",
      location: "Pune",
      period: "Jun 2018 – Jun 2019",
      points: [
        "Managed Linux server infrastructure (RHEL, Ubuntu) for banking client with 500+ servers across 3 data centers",
        "Wrote Bash and Python scripts to automate routine maintenance tasks, saving 20+ hours/week for the operations team",
        "Supported production deployments and rollbacks during release windows with zero downtime for critical banking applications",
        "Configured Nagios monitoring for server health checks, disk usage, and network latency across the infrastructure",
        "Participated in on-call rotation handling P1/P2 incidents, maintaining 99.9% SLA compliance for the banking client",
      ],
    },
  ],

  projects: [
    {
      name: "REINIT - AI Career Intelligence Platform",
      tech: "Next.js · Fastify · FastAPI · Qdrant · PostgreSQL · GPT-4o",
      description:
        "Co-built a full-stack SaaS platform that provides AI-powered job matching, resume tailoring, interview preparation, and career intelligence for Indian job seekers.",
      github: "https://github.com/shankarsamidala/reinit",
      live: "https://reinit.in",
    },
    {
      name: "Kubernetes Auto-Scaler Dashboard",
      tech: "React · Go · Prometheus · Grafana · K8s API",
      description:
        "Built a real-time dashboard for monitoring and configuring Kubernetes HPA/VPA policies. Displays pod metrics, scaling events, and cost projections.",
      github: "https://github.com/shankarsamidala/k8s-scaler",
    },
  ],

  education: [
    {
      degree: "Master of Technology (M.Tech)",
      field: "Computer Science & Engineering",
      institution: "JNTU Hyderabad",
      year: "2018",
      score: "8.2 CGPA",
    },
    {
      degree: "Bachelor of Technology (B.Tech)",
      field: "Information Technology",
      institution: "Osmania University",
      year: "2016",
      score: "7.8 CGPA",
    },
    {
      degree: "Intermediate (12th)",
      field: "MPC",
      institution: "Narayana Junior College, Hyderabad",
      year: "2012",
      score: "94.5%",
    },
    {
      degree: "SSC (10th)",
      institution: "Kendriya Vidyalaya, Secunderabad",
      year: "2010",
      score: "89.2%",
    },
  ],

  certifications: [
    {
      name: "AWS Certified Solutions Architect – Associate",
      issuer: "Amazon Web Services",
      year: "2023",
    },
    {
      name: "Certified Kubernetes Administrator (CKA)",
      issuer: "CNCF / Linux Foundation",
      year: "2022",
    },
    { name: "HashiCorp Certified: Terraform Associate", issuer: "HashiCorp", year: "2021" },
  ],

  languages: [
    { name: "English", level: "Professional" },
    { name: "Hindi", level: "Professional" },
    { name: "Telugu", level: "Native" },
  ],
};
