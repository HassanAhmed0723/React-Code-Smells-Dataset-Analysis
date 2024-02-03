# React-Code-Smells-Dataset-Analysis

## Overview
This repository contains a React Component Smell Dataset that was gathered using two specific tools ReactSniffer and ReactRecon. ReactSniffer is a publicly tool while ReactRecon - A static tool for React Code Smell Detection was developed by me along with my associates as a part of our Final Year Project. More than 200 benchmark React Code Repositories were analysed to gather this Dataset. 

## Files
1. **DatasetAnalysis.ipynb**: Jupyter Notebook containing Exploratory Data Analysis (EDA) on the dataset.

2. **DatasetFiles.zip**: Compressed archive containing snippet files associated with the React smells.

3. **sample_smells_dataset.csv**: CSV file providing detailed information about the React smells dataset. It includes columns for ID, smell name (Smell), and relative path (Fpath).

## React Smells
- Inefficient Rendering
- Props in Initial State
- Too Many Props
- Low Cohesion
- Props Drilling
- Inheritance instead of Composition

## Usage
1. **EDA (Exploratory Data Analysis):** Open and explore `DatasetAnalysis.ipynb` using Jupyter Notebook for insights into the React smells dataset.

2. **Dataset Files:** Extract the contents of `DatasetFiles.zip` to access individual snippet files associated with each React smell.

3. **CSV Dataset:** Utilize `sample_smells_dataset.csv` for a structured overview of the React smells, including file ID, smell names, and relative paths.

Feel free to use this dataset for research, analysis, or any other purposes related to understanding and addressing React component smells.

ReactSniffer: https://github.com/fabiosferreira/reactsniffer
