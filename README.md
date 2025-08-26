# Master’s Tactics — README

**Master’s Tactics** is a fan-made web app concept for **Fire Emblem Heroes (FEH)** focused on fast hero browsing, clean presentation, and practical filtering.

> **Legal:** Fire Emblem, FEH, and related assets are property of Nintendo/Intelligent Systems. This project is unofficial and non-commercial.

## Overview

The project’s goal is to provide an intuitive hero directory with search and filters (weapon, movement, color, origin, etc.), backed by a simplified data model designed for easy maintenance and iteration.

## Data Source (High-level)

A custom pipeline pulls and filters content from the Fandom FEH wiki into refined JSON datasets. These datasets are intended to power the app’s UI without heavy runtime parsing.

## Status

Active development / early stage. Not functional yet; UI and data structures are being stabilized before feature work continues.

## Vision (planned)

* Fast hero search with compact, mobile-friendly cards
* Flexible filtering
* Clear, human-readable data fields geared for maintainability
* Future detail pages with stats, kits, and cross-links

## Tech (planned)

* React + TypeScript for the front end
* Lightweight adapters for data normalization
