import React, { useState } from 'react';
import { BookOpen, Copy, Check, X } from 'lucide-react';

interface ArchitectureDocsProps {
  onClose: () => void;
}

export const ArchitectureDocs: React.FC<ArchitectureDocsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'fastapi' | 'docker' | 'schema'>('pipeline');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fastApiCode = `# ChaosBrain AI - Backend Engine (FastAPI)
# backend/app/main.py

from fastapi import FastAPI, Depends, HTTPException, WebSocket, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import networkx as nx
from typing import List, Optional
import uuid, datetime

app = FastAPI(
    title="ChaosBrain AI Resilience & RCA API",
    version="2.4.0",
    docs_url="/docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graph = nx.DiGraph()

class ExperimentRequest(BaseModel):
    target_service_id: str
    failure_type: str
    intensity: int
    duration: int

@app.post("/api/experiments/start")
async def start_chaos_experiment(req: ExperimentRequest):
    exp_id = f"EXP-{uuid.uuid4().hex[:8]}"
    descendants = nx.descendants(graph, req.target_service_id)
    return {
        "experiment_id": exp_id,
        "target": req.target_service_id,
        "blast_radius_nodes": list(descendants),
        "status": "RUNNING"
    }

@app.post("/api/rca/{incident_id}/analyze")
async def perform_root_cause_analysis(incident_id: str):
    return {
        "incident_id": incident_id,
        "probable_root_cause": "payment-service",
        "confidence": 0.88,
        "evidence": [
            "Downstream latency in payment-service exceeded 750ms",
            "Order-service thread pool saturated due to missing circuit breaker"
        ]
    }

@app.post("/api/remediation/{incident_id}/generate")
async def generate_patch(incident_id: str):
    return {
        "action": "ENABLE_CIRCUIT_BREAKER",
        "patch_yaml": "circuitBreaker:\\n  enabled: true\\n  timeout: 4500ms",
        "validation": {"syntax_valid": True, "risk_level": "VALID"}
    }
`;

  const dockerComposeCode = `# ChaosBrain AI - Production Local Sandbox
# docker-compose.yml

version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://chaos_user:chaos_pass@postgres:5432/chaosbraindb
      - JWT_SECRET=prod_super_secret_signing_key_2026
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=chaos_user
      - POSTGRES_PASSWORD=chaos_pass
      - POSTGRES_DB=chaosbraindb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`;

  const sqlSchema = `-- ChaosBrain AI - PostgreSQL Schema
-- Database DDL: Normalized relational structure

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'ENGINEER', 'VIEWER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    environment VARCHAR(50) DEFAULT 'production-sim',
    resilience_target INT DEFAULT 90,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
    id VARCHAR(100) PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    tier INT NOT NULL CHECK (tier IN (1, 2, 3)),
    criticality NUMERIC(3, 2) NOT NULL,
    baseline_latency INT NOT NULL,
    baseline_error_rate NUMERIC(4, 2) NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_service VARCHAR(100) REFERENCES services(id),
    target_service VARCHAR(100) REFERENCES services(id),
    protocol VARCHAR(50) NOT NULL,
    timeout_ms INT NOT NULL,
    is_critical BOOLEAN DEFAULT TRUE,
    circuit_breaker BOOLEAN DEFAULT FALSE
);

CREATE TABLE chaos_experiments (
    id VARCHAR(100) PRIMARY KEY,
    target_service_id VARCHAR(100) REFERENCES services(id),
    failure_type VARCHAR(50) NOT NULL,
    intensity INT NOT NULL,
    duration INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    blast_radius NUMERIC(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incidents (
    id VARCHAR(100) PRIMARY KEY,
    experiment_id VARCHAR(100) REFERENCES chaos_experiments(id),
    severity VARCHAR(50) NOT NULL,
    affected_service VARCHAR(100) REFERENCES services(id),
    trigger_metric TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0f13] border border-[#22242e] rounded-lg max-w-4xl w-full shadow-2xl flex flex-col max-h-[88vh] text-xs">
        {/* Header */}
        <div className="p-4 border-b border-[#22242e] flex items-center justify-between bg-[#13141a]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm text-white">
              System Architecture, FastAPI Engine & Cloud Specifications
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#717380] hover:text-white p-1 hover:bg-[#1a1c22] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center border-b border-[#1f2128] bg-[#0c0d10] px-4 font-mono-code text-xs">
          {[
            { id: 'pipeline', label: '1. Architecture & Pipeline' },
            { id: 'fastapi', label: '2. FastAPI Core (Python)' },
            { id: 'docker', label: '3. Docker Compose Spec' },
            { id: 'schema', label: '4. PostgreSQL DDL Schema' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-white text-white'
                  : 'border-transparent text-[#717380] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 font-mono-code text-xs">
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="bg-[#121318] p-4 rounded border border-[#1f2128] text-[#d1d5db] space-y-2">
                <span className="font-bold text-white text-sm block">End-to-End Resilience Pipeline</span>
                <pre className="text-[11px] text-[#ededef] leading-relaxed overflow-x-auto whitespace-pre">
{`Infrastructure / Service Configuration
            ↓
Dependency Graph Construction (NetworkX Directed Graph)
            ↓
System Health Baseline (Metrics Calibration)
            ↓
Chaos Scenario Generation (High Latency, Pod Crash, Error Spike)
            ↓
Controlled Failure Simulation (Tick-by-Tick Propagation Physics)
            ↓
Telemetry Collection (Latency, Error Rate, CPU, RPS)
            ↓
Incident Detection (Statistical Z-Score + Multi-Threshold Breach)
            ↓
Graph-Based Blast Radius Analysis (Downstream Reachability & Criticality)
            ↓
Root Cause Analysis (Deterministic Temporal Precedence + Causal Path)
            ↓
AI-Assisted Remediation (Envoy Circuit Breaker, Timeout, Replica Scaling)
            ↓
Patch / Configuration Recommendation (Unified Git Diff)
            ↓
Multi-Stage Validation (Syntax, Timeout Bounds, Storm Check)
            ↓
Resilience Score & Audit Report (+44 points Benchmark)`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'fastapi' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#717380]">backend/app/main.py</span>
                <button
                  onClick={() => handleCopy(fastApiCode)}
                  className="flex items-center gap-1 text-[11px] text-white hover:text-emerald-400"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="bg-[#0b0c10] p-3 rounded border border-[#1f2128] text-white overflow-x-auto text-[11px] whitespace-pre leading-relaxed">
                {fastApiCode}
              </pre>
            </div>
          )}

          {activeTab === 'docker' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#717380]">docker-compose.yml</span>
                <button
                  onClick={() => handleCopy(dockerComposeCode)}
                  className="flex items-center gap-1 text-[11px] text-white hover:text-emerald-400"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="bg-[#0b0c10] p-3 rounded border border-[#1f2128] text-emerald-300 overflow-x-auto text-[11px] whitespace-pre leading-relaxed">
                {dockerComposeCode}
              </pre>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#717380]">db/schema.sql (PostgreSQL 16)</span>
                <button
                  onClick={() => handleCopy(sqlSchema)}
                  className="flex items-center gap-1 text-[11px] text-white hover:text-emerald-400"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="bg-[#0b0c10] p-3 rounded border border-[#1f2128] text-amber-300 overflow-x-auto text-[11px] whitespace-pre leading-relaxed">
                {sqlSchema}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
