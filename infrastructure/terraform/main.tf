terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.10"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.5"
    }
  }
  backend "s3" {
    bucket = "footanalytics-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "eu-west-1"
  }
}

provider "aws" {
  region = "eu-west-1"
}

# EKS Cluster with GPU support
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "18.0.0"
  
  cluster_name = "footanalytics-cluster"
  cluster_version = "1.24"
  
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  # Main node group for general workloads
  node_groups = {
    main = {
      desired_capacity = 3
      max_capacity     = 10
      min_capacity     = 3
      instance_types   = ["m5.large"]
    }
    
    # GPU node group for ML workloads
    gpu = {
      desired_capacity = 2
      max_capacity     = 5
      min_capacity     = 1
      instance_types   = ["g4dn.xlarge"]
      
      k8s_labels = {
        workload = "gpu"
      }
      
      taints = [
        {
          key    = "nvidia.com/gpu"
          value  = "true"
          effect = "NoSchedule"
        }
      ]
    }
  }
}

# RDS PostgreSQL for application data
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "3.0.0"
  
  identifier = "footanalytics-db"
  
  engine            = "postgres"
  engine_version    = "13.4"
  instance_class    = "db.r5.large"
  allocated_storage = 100
  
  db_name  = "footanalytics"
  username = "postgres"
  password = var.db_password
  port     = "5432"
  
  maintenance_window = "Mon:00:00-Mon:03:00"
  backup_window      = "03:00-06:00"
  
  multi_az = true
  
  vpc_security_group_ids = [module.security_group_rds.security_group_id]
  subnet_ids             = module.vpc.database_subnets
}

# S3 bucket for video storage
module "s3_bucket" {
  source = "terraform-aws-modules/s3-bucket/aws"
  
  bucket = "footanalytics-videos"
  acl    = "private"
  
  versioning = {
    enabled = true
  }
  
  lifecycle_rule = [
    {
      id      = "archive"
      enabled = true
      
      transition = [
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
    }
  ]
}

# Include Pulsar module
module "pulsar" {
  source = "./modules/pulsar"
}

# Include TimescaleDB module
module "timescaledb" {
  source = "./modules/timescaledb"
}

# Include Istio module
module "istio" {
  source = "./modules/istio"
}

# Include Prometheus module
module "prometheus" {
  source = "./modules/prometheus"
}

# Include Alertmanager module
module "alertmanager" {
  source = "./modules/alertmanager"
  
  depends_on = [
    module.prometheus
  ]
}