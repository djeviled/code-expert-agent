export interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  credential_fields: CredentialField[];
  description: string;
  docs_url: string;
}

export interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "password";
  required: boolean;
  help_text: string;
}

export interface UserCredential {
  id: string;
  user_id: string;
  platform_id: string;
  credentials: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export const PLATFORMS: Platform[] = [
  {
    id: "github",
    name: "GitHub",
    icon: "🐱",
    color: "#24292f",
    description: "Repository access for reading and writing code",
    docs_url: "https://github.com/settings/tokens",
    credential_fields: [
      {
        key: "access_token",
        label: "Personal Access Token",
        placeholder: "ghp_xxxxxxxxxxxx",
        type: "password",
        required: true,
        help_text: "Generate at GitHub → Settings → Developer settings → Personal access tokens"
      },
      {
        key: "repo_full_name",
        label: "Repository",
        placeholder: "username/repository",
        type: "text",
        required: true,
        help_text: "The repository to work on, e.g. myname/my-app"
      }
    ]
  },
  {
    id: "vercel",
    name: "Vercel",
    icon: "▲",
    color: "#000000",
    description: "Deployment platform access",
    docs_url: "https://vercel.com/docs/rest-apis#api-authentication",
    credential_fields: [
      {
        key: "access_token",
        label: "Vercel API Token",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxx",
        type: "password",
        required: true,
        help_text: "Generate at Vercel → Settings → Tokens"
      },
      {
        key: "team_id",
        label: "Team ID (optional)",
        placeholder: "team_xxxxxxxxxx",
        type: "text",
        required: false,
        help_text: "Only needed if under a Vercel team account"
      }
    ]
  },
  {
    id: "supabase",
    name: "Supabase",
    icon: "⚡",
    color: "#3ECF8E",
    description: "PostgreSQL database and backend",
    docs_url: "https://supabase.com/dashboard/project/_/settings/api",
    credential_fields: [
      {
        key: "reference_id",
        label: "Project Reference ID",
        placeholder: "xxxxxxxxxxxx",
        type: "text",
        required: true,
        help_text: "Found in Supabase → Settings → API → Project ID"
      },
      {
        key: "api_key",
        label: "API Key (anon public)",
        placeholder: "eyJhbGc...",
        type: "password",
        required: true,
        help_text: "Supabase → Settings → API → anon/public key"
      },
      {
        key: "service_role_key",
        label: "Service Role Key",
        placeholder: "eyJhbGc...",
        type: "password",
        required: true,
        help_text: "Supabase → Settings → API → service_role key (keep secret!)"
      },
      {
        key: "database_url",
        label: "Database URL",
        placeholder: "postgresql://user:pass@host:5432/db",
        type: "text",
        required: false,
        help_text: "Direct PostgreSQL connection string (optional, for migrations)"
      }
    ]
  },
  {
    id: "firebase",
    name: "Firebase",
    icon: "🔥",
    color: "#FFCA28",
    description: "Google Firebase backend services",
    docs_url: "https://console.firebase.google.com",
    credential_fields: [
      {
        key: "project_id",
        label: "Firebase Project ID",
        placeholder: "my-app-firebase",
        type: "text",
        required: true,
        help_text: "Found in Firebase Console → Project Settings → General"
      },
      {
        key: "service_account_json",
        label: "Service Account JSON",
        placeholder: '{"type": "service_account", ...}',
        type: "text",
        required: true,
        help_text: "Firebase → Project Settings → Service accounts → Generate new private key"
      }
    ]
  },
  {
    id: "neon",
    name: "Neon",
    icon: "🌌",
    color: "#00E5CC",
    description: "Serverless PostgreSQL database",
    docs_url: "https://neon.tech/docs/api-reference",
    credential_fields: [
      {
        key: "project_id",
        label: "Project ID",
        placeholder: "xxxx-xxxx-xxxx",
        type: "text",
        required: true,
        help_text: "Found in Neon Dashboard → Settings → Connection Details"
      },
      {
        key: "branch",
        label: "Branch",
        placeholder: "main",
        type: "text",
        required: false,
        help_text: "Branch name (leave empty for default)"
      },
      {
        key: "connection_string",
        label: "Connection String",
        placeholder: "postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require",
        type: "text",
        required: true,
        help_text: "Neon → Connection Details → Connection string"
      }
    ]
  },
  {
    id: "railway",
    name: "Railway",
    icon: "🚂",
    color: "#C62828",
    description: "Infrastructure and deployment platform",
    docs_url: "https://docs.railway.app",
    credential_fields: [
      {
        key: "api_token",
        label: "Railway API Token",
        placeholder: "xxxxxxxx-xxxx-xxxx",
        type: "password",
        required: true,
        help_text: "Railway → Settings → API Tokens"
      },
      {
        key: "project_id",
        label: "Project ID",
        placeholder: "xxxxxxxx-xxxx-xxxx",
        type: "text",
        required: false,
        help_text: "Found in Railway project URL or settings"
      }
    ]
  },
  {
    id: "planetscale",
    name: "PlanetScale",
    icon: "🌍",
    color: "#000000",
    description: "Serverless MySQL database",
    docs_url: "https://planetscale.com/docs",
    credential_fields: [
      {
        key: "org_name",
        label: "Organization Name",
        placeholder: "my-org",
        type: "text",
        required: true,
        help_text: "PlanetScale organization name from dashboard"
      },
      {
        key: "database",
        label: "Database Name",
        placeholder: "my-database",
        type: "text",
        required: false,
        help_text: "Name of the database to connect to"
      },
      {
        key: "password",
        label: "Password",
        placeholder: "pscale_pw_xxxx",
        type: "password",
        required: true,
        help_text: "PlanetScale → Database → Branch → Connect → New password"
      }
    ]
  },
  {
    id: "aws",
    name: "AWS",
    icon: "☁️",
    color: "#FF9900",
    description: "Amazon Web Services",
    docs_url: "https://docs.aws.amazon.com",
    credential_fields: [
      {
        key: "access_key_id",
        label: "Access Key ID",
        placeholder: "AKIAXXXXXXXX",
        type: "text",
        required: true,
        help_text: "AWS IAM → Users → Security credentials → Access keys"
      },
      {
        key: "secret_access_key",
        label: "Secret Access Key",
        placeholder: "xxxxxxxxxxxxxxxxxxxx",
        type: "password",
        required: true,
        help_text: "AWS IAM → Users → Security credentials → Secret access key"
      },
      {
        key: "region",
        label: "Default Region",
        placeholder: "us-east-1",
        type: "text",
        required: false,
        help_text: "AWS region for S3, Lambda, ECS, etc."
      }
    ]
  },
  {
    id: "awsAmplify",
    name: "AWS Amplify",
    icon: "📡",
    color: "#FF9900",
    description: "AWS Amplify hosting and backend",
    docs_url: "https://docs.amplify.aws",
    credential_fields: [
      {
        key: "access_key_id",
        label: "Access Key ID",
        placeholder: "AKIAXXXXXXXX",
        type: "text",
        required: true,
        help_text: "AWS IAM → Users → Security credentials → Access keys"
      },
      {
        key: "secret_access_key",
        label: "Secret Access Key",
        placeholder: "xxxxxxxxxxxxxxxxxxxx",
        type: "password",
        required: true,
        help_text: "AWS IAM → Users → Security credentials → Secret access key"
      },
      {
        key: "app_id",
        label: "Amplify App ID",
        placeholder: "xxxxxxxxxxxx",
        type: "text",
        required: false,
        help_text: "Found in AWS Amplify console URL"
      }
    ]
  },
  {
    id: "netlify",
    name: "Netlify",
    icon: "🌐",
    color: "#00C7B7",
    description: "Static site hosting and functions",
    docs_url: "https://docs.netlify.com",
    credential_fields: [
      {
        key: "access_token",
        label: "Personal Access Token",
        placeholder: "netlify_xxxxxxxx",
        type: "password",
        required: true,
        help_text: "Netlify → User settings → OAuth → Personal access tokens"
      },
      {
        key: "site_id",
        label: "Site ID (optional)",
        placeholder: "xxxxxxxx-xxxx-xxxx",
        type: "text",
        required: false,
        help_text: "Found in Netlify → Site settings → General → Site ID"
      }
    ]
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    icon: "🛡️",
    color: "#F38020",
    description: "Workers, Pages, R2, D1, and more",
    docs_url: "https://dash.cloudflare.com",
    credential_fields: [
      {
        key: "api_token",
        label: "API Token",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        type: "password",
        required: true,
        help_text: "Cloudflare → Profile → API Tokens → Create Token"
      },
      {
        key: "account_id",
        label: "Account ID",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        type: "text",
        required: true,
        help_text: "Cloudflare Dashboard → Overview → Account ID"
      }
    ]
  },
  {
    id: "mongodb",
    name: "MongoDB Atlas",
    icon: "🍃",
    color: "#00ED64",
    description: "NoSQL document database",
    docs_url: "https://www.mongodb.com/docs/atlas",
    credential_fields: [
      {
        key: "connection_string",
        label: "Connection String",
        placeholder: "mongodb+srv://user:pass@cluster.mongodb.net",
        type: "text",
        required: true,
        help_text: "MongoDB Atlas → Cluster → Connect → Connect your application"
      },
      {
        key: "database_name",
        label: "Database Name",
        placeholder: "myDatabase",
        type: "text",
        required: false,
        help_text: "Name of the database to connect to"
      }
    ]
  },
  {
    id: "other",
    name: "Other",
    icon: "🔌",
    color: "#6B7280",
    description: "Custom platform or API",
    docs_url: "",
    credential_fields: [
      {
        key: "name",
        label: "Platform Name",
        placeholder: "My Platform",
        type: "text",
        required: true,
        help_text: "Name of the platform or service"
      },
      {
        key: "base_url",
        label: "API Base URL",
        placeholder: "https://api.platform.com/v1",
        type: "text",
        required: false,
        help_text: "Base URL for the platform API"
      },
      {
        key: "api_key",
        label: "API Key / Token",
        placeholder: "xxxxxxxx",
        type: "password",
        required: true,
        help_text: "Your API key or token"
      },
      {
        key: "notes",
        label: "Notes",
        placeholder: "Any additional notes about this connection",
        type: "text",
        required: false,
        help_text: "Optional notes about this connection"
      }
    ]
  }
];