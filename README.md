# Java Spring Boot Todo App Backend (In-Memory Storage)

A complete Spring Boot REST API for managing Todo items using thread-safe in-memory List storage (no database dependency).

## Features

- **No Database Required**: Uses a thread-safe `CopyOnWriteArrayList` with `AtomicLong` for local in-memory storage.
- **RESTful Endpoints**: Complete CRUD operations for Todo management.
- **Filtering, Searching & Sorting**: Filter by completion status, search by text, and sort by due date, priority, title, or creation date.
- **Validation**: Request validation using `@Valid`, `@NotBlank`, and `@Size`.
- **Global Error Handling**: Standardized JSON error responses (`400 Bad Request`, `404 Not Found`, `500 Internal Server Error`).
- **CORS Support**: `@CrossOrigin` configured for frontend integrations.
- **Automated Tests**: Integration tests covering all REST endpoints with `MockMvc`.

---

## How to Run

### Run Locally

```bash
./mvnw spring-boot:run
```

The application will start on `http://localhost:8080`.

### Run Tests

```bash
./mvnw test
```

---

## API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/todos` | Fetch all todos (Supports `completed`, `search`, `sortBy` query params) |
| `GET` | `/api/todos/{id}` | Fetch a single todo item by ID |
| `POST` | `/api/todos` | Create a new todo item |
| `PUT` | `/api/todos/{id}` | Update an existing todo item |
| `PATCH` | `/api/todos/{id}/toggle` | Toggle completion status of a todo item |
| `DELETE` | `/api/todos/{id}` | Delete a todo item by ID |
| `DELETE` | `/api/todos` | Delete all todos (use `?completedOnly=true` to delete completed items only) |

---

## Example API Requests & Responses

### 1. Create a Todo (`POST /api/todos`)

**Request:**
```json
POST /api/todos
Content-Type: application/json

{
  "title": "Buy Groceries",
  "description": "Milk, Eggs, Bread, and Coffee",
  "priority": "HIGH",
  "dueDate": "2026-08-20T18:00:00"
}
```

**Response (`201 Created`):**
```json
{
  "id": 3,
  "title": "Buy Groceries",
  "description": "Milk, Eggs, Bread, and Coffee",
  "completed": false,
  "priority": "HIGH",
  "dueDate": "2026-08-20T18:00:00",
  "createdAt": "2026-08-13T13:20:00",
  "updatedAt": "2026-08-13T13:20:00"
}
```

---

### 2. Get All Todos (`GET /api/todos`)

**Request:**
```http
GET /api/todos?completed=false&sortBy=priority
```

**Response (`200 OK`):**
```json
{
  "totalCount": 2,
  "completedCount": 1,
  "pendingCount": 1,
  "todos": [
    {
      "id": 2,
      "title": "Test REST Endpoints",
      "description": "Perform GET, POST, PUT, PATCH, and DELETE requests",
      "completed": false,
      "priority": "MEDIUM",
      "dueDate": "2026-08-15T13:17:00",
      "createdAt": "2026-08-13T12:17:00",
      "updatedAt": "2026-08-13T13:17:00"
    }
  ]
}
```

---

### 3. Toggle Todo Completion (`PATCH /api/todos/{id}/toggle`)

**Request:**
```http
PATCH /api/todos/2/toggle
```

**Response (`200 OK`):**
```json
{
  "id": 2,
  "title": "Test REST Endpoints",
  "description": "Perform GET, POST, PUT, PATCH, and DELETE requests",
  "completed": true,
  "priority": "MEDIUM",
  "dueDate": "2026-08-15T13:17:00",
  "createdAt": "2026-08-13T12:17:00",
  "updatedAt": "2026-08-13T13:21:00"
}
```

---

### 4. Delete Todo (`DELETE /api/todos/{id}`)

**Request:**
```http
DELETE /api/todos/1
```

**Response (`204 No Content`)**
