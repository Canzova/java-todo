package com.canzova.todo.app.service;

import com.canzova.todo.app.dto.CreateTodoRequest;
import com.canzova.todo.app.dto.TodoListResponse;
import com.canzova.todo.app.dto.TodoResponse;
import com.canzova.todo.app.dto.UpdateTodoRequest;
import com.canzova.todo.app.exception.ResourceNotFoundException;
import com.canzova.todo.app.model.Priority;
import com.canzova.todo.app.model.TodoItem;
import com.canzova.todo.app.repository.TodoRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class TodoService {

    private final TodoRepository todoRepository;

    public TodoService(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    public TodoListResponse getAllTodos(Boolean completed, String search, String sortBy) {
        List<TodoItem> allItems = todoRepository.findAll();

        int totalCount = allItems.size();
        int completedCount = (int) allItems.stream().filter(TodoItem::isCompleted).count();
        int pendingCount = totalCount - completedCount;

        Stream<TodoItem> stream = allItems.stream();

        // Filter by completion status if specified
        if (completed != null) {
            stream = stream.filter(item -> item.isCompleted() == completed);
        }

        // Filter by search query if specified
        if (search != null && !search.trim().isEmpty()) {
            String lowerSearch = search.trim().toLowerCase();
            stream = stream.filter(item -> 
                    (item.getTitle() != null && item.getTitle().toLowerCase().contains(lowerSearch)) ||
                    (item.getDescription() != null && item.getDescription().toLowerCase().contains(lowerSearch))
            );
        }

        // Sorting logic
        if (sortBy != null) {
            switch (sortBy.toLowerCase()) {
                case "title":
                    stream = stream.sorted(Comparator.comparing(TodoItem::getTitle, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
                    break;
                case "priority":
                    stream = stream.sorted(Comparator.comparing(TodoItem::getPriority, Comparator.nullsLast(Comparator.naturalOrder())));
                    break;
                case "duedate":
                    stream = stream.sorted(Comparator.comparing(TodoItem::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())));
                    break;
                case "createdat":
                default:
                    stream = stream.sorted(Comparator.comparing(TodoItem::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
                    break;
            }
        } else {
            // Default sort: newest created first
            stream = stream.sorted(Comparator.comparing(TodoItem::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        }

        List<TodoResponse> todos = stream
                .map(TodoResponse::fromEntity)
                .collect(Collectors.toList());

        return new TodoListResponse(totalCount, completedCount, pendingCount, todos);
    }

    public TodoResponse getTodoById(Long id) {
        TodoItem item = todoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Todo item with ID " + id + " not found"));
        return TodoResponse.fromEntity(item);
    }

    public TodoResponse createTodo(CreateTodoRequest request) {
        TodoItem item = new TodoItem();
        item.setTitle(request.getTitle().trim());
        item.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        item.setCompleted(false);
        item.setPriority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM);
        item.setDueDate(request.getDueDate());

        TodoItem saved = todoRepository.save(item);
        return TodoResponse.fromEntity(saved);
    }

    public TodoResponse updateTodo(Long id, UpdateTodoRequest request) {
        TodoItem existing = todoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Todo item with ID " + id + " not found"));

        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            existing.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription().trim());
        }
        if (request.getCompleted() != null) {
            existing.setCompleted(request.getCompleted());
        }
        if (request.getPriority() != null) {
            existing.setPriority(request.getPriority());
        }
        if (request.getDueDate() != null) {
            existing.setDueDate(request.getDueDate());
        }

        TodoItem updated = todoRepository.save(existing);
        return TodoResponse.fromEntity(updated);
    }

    public TodoResponse toggleTodoCompletion(Long id) {
        TodoItem existing = todoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Todo item with ID " + id + " not found"));

        existing.setCompleted(!existing.isCompleted());
        TodoItem updated = todoRepository.save(existing);
        return TodoResponse.fromEntity(updated);
    }

    public void deleteTodo(Long id) {
        boolean removed = todoRepository.deleteById(id);
        if (!removed) {
            throw new ResourceNotFoundException("Todo item with ID " + id + " not found");
        }
    }

    public void deleteAllTodos() {
        todoRepository.deleteAll();
    }

    public void deleteCompletedTodos() {
        todoRepository.deleteCompleted();
    }
}
