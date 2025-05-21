# SE4458 Assignment 2

## Overview
The purpose of this project is to allow users to interact with a mobile billing API using natural language through an AI chatbot interface.
* [Video presentation Google Drive link.](https://drive.google.com/drive/folders/1PxD7Bblp_PDxtmOZuNSYy4KkF3WXUWSO)

## Tech Stack

* **Frontend & Gateway**: Node.js (developed in WebStorm)
* **AI Model**: [Ollama Mistral](https://ollama.com/library/mistral) (running locally)
* **Backend API**: Spring Boot (with Swagger UI for testing and documentation)
* **Databases**:

  * **Firebase Realtime Database**: For chat data
  * **Render.com PostgreSQL**: For billing data managed by the Spring Boot API

## System Architecture

```
User (Browser UI)
       |
       v
Node.js UI
       |
       v
Node.js API Gateway
     /     \
    v       v
AI Model   Spring Boot API
(Ollama)     (Mobile Billing)
```

The Node.js API Gateway serves as a mediator between the AI and the backend API. It send a syntax strict prompt to the AI and forwards the request to the mobile billing system. The AI and the Spring Boot API do not communicate directly.

## Project Architecture
```
api-chat
	├───.idea
	│		...
	├───api-chat-ui
	│	├───node_modules
	│	│		...
	│	├───public
	│	│		...
	│	└───src
	│			App.css
	│			App.js
	│			firebase.js
	│			index.css
	│			index.js
	│			logo.svg
	│			reportWebVitals.js
	│			setupTests.js
	│		package.json
	│		package-lock.json
	│
	├───api-gateway
	│	└───node_modules
	│			...
	│		.env
	│		index.js
	│		package.json
	│		package-lock.json
	│		se-4458-assignment-2-firebase-adminsdk-fbsvc-456b0d2521.json
	├───react-frontend
	│		...
	│
	│	README.md
```


## Features

The system supports the following AI-driven actions in real time:

1. **Bill Query**

   * Parameters: `userId`, `year`, `month`
   * Description: Retrieves a user's billing summary for the given month and year.

2. **Detailed Bill Query**

   * Parameters: `userId`
   * Description: Provides a full breakdown of the user's current or recent bill.

3. **Pay Bill**

   * Parameters: `userId`, `year`, `month`, `amount`
   * Description: Simulates payment processing for a specified bill.

Users can perform these actions by chatting with the AI through a web-based interface. The AI interprets the user's intent and converts it into structured requests sent via the gateway.

## Assumptions & Limitations

* No specified requirement on what the user messages should and should not include, so things such as keeping user id or last bill in memory were not implemented.
* Only query bill, query bill detailed and pay bill were implemented. Adding usage or calculating bills are out of what the AI assistant can do.
* Paying partially also doesnt work because the database of the API got deleted by the provider, thus resetting the database rules from the midterm requirements.
* Firebase caused so many connection issues that the most time wasting part of this project was dealing with a Google product.

---
