-- PostgreSQL setup for Health Hub backend
-- Run this file in psql as a superuser:
-- psql -U postgres -f database/postgres-setup.sql

DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'postgres') THEN
      CREATE ROLE postgres LOGIN PASSWORD 'postgres';
   END IF;
END
$$;

DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'health_hub') THEN
      CREATE DATABASE health_hub OWNER postgres;
   END IF;
END
$$;
