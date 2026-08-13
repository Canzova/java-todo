package com.canzova.todo.app.controller;

import com.canzova.todo.app.dto.CreateTodoRequest;
import com.canzova.todo.app.dto.TodoListResponse;
import com.canzova.todo.app.dto.TodoResponse;
import com.canzova.todo.app.dto.UpdateTodoRequest;
import com.canzova.todo.app.service.TodoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/todos")
@CrossOrigin(origins = "*")
public class TodoController {

    private final TodoService todoService;

    public TodoController(TodoService todoService) {
        this.todoService = todoService;
    }

    /**
     * GET /api/todos
     * Get all todos with optional filtering and sorting
     */
    @GetMapping
    public ResponseEntity<TodoListResponse> getAllTodos(
            @RequestParam(required = false) Boolean completed,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sortBy) {
        TodoListResponse response = todoService.getAllTodos(completed, search, sortBy);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/todos/{id}
     * Get a single todo item by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<TodoResponse> getTodoById(@PathVariable Long id) {
        TodoResponse response = todoService.getTodoById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/todos
     * Create a new todo item
     */
    @PostMapping
    public ResponseEntity<TodoResponse> createTodo(@Valid @RequestBody CreateTodoRequest request) {
        TodoResponse created = todoService.createTodo(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/todos/{id}
     * Update an existing todo item
     */
    @PutMapping("/{id}")
    public ResponseEntity<TodoResponse> updateTodo(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTodoRequest request) {
        TodoResponse updated = todoService.updateTodo(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * PATCH /api/todos/{id}/toggle
     * Toggle the completion status of a todo item
     */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<TodoResponse> toggleTodoCompletion(@PathVariable Long id) {
        TodoResponse updated = todoService.toggleTodoCompletion(id);
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/todos/{id}
     * Delete a single todo item by ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTodo(@PathVariable Long id) {
        todoService.deleteTodo(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/todos
     * Delete all todos, or only completed todos if completedOnly=true
     */
    @DeleteMapping
    public ResponseEntity<Void> deleteAllTodos(@RequestParam(required = false, defaultValue = "false") boolean completedOnly) {
        if (completedOnly) {
            todoService.deleteCompletedTodos();
        } else {
            todoService.deleteAllTodos();
        }
        return ResponseEntity.noContent().build();
    }
}
