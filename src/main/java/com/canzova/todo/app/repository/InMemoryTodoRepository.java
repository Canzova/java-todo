package com.canzova.todo.app.repository;

import com.canzova.todo.app.model.Priority;
import com.canzova.todo.app.model.TodoItem;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class InMemoryTodoRepository implements TodoRepository {

    // Thread-safe in-memory List storage (no database)
    private final List<TodoItem> todoStorage = new CopyOnWriteArrayList<>();
    private final AtomicLong idSequence = new AtomicLong(1);

    public InMemoryTodoRepository() {
        // Seed initial sample data
        saveSeedData();
    }

    private void saveSeedData() {
        TodoItem item1 = new TodoItem();
        item1.setId(idSequence.getAndIncrement());
        item1.setTitle("Setup Spring Boot Todo App");
        item1.setDescription("Build REST backend with in-memory storage");
        item1.setCompleted(true);
        item1.setPriority(Priority.HIGH);
        item1.setDueDate(LocalDateTime.now().plusDays(1));
        item1.setCreatedAt(LocalDateTime.now().minusHours(8));
        item1.setUpdatedAt(LocalDateTime.now().minusHours(8));
        todoStorage.add(item1);

        TodoItem item2 = new TodoItem();
        item2.setId(idSequence.getAndIncrement());
        item2.setTitle("Test REST Endpoints");
        item2.setDescription("Perform GET, POST, PUT, PATCH, and DELETE requests");
        item2.setCompleted(false);
        item2.setPriority(Priority.MEDIUM);
        item2.setDueDate(LocalDateTime.now().plusDays(2));
        item2.setCreatedAt(LocalDateTime.now().minusHours(7));
        item2.setUpdatedAt(LocalDateTime.now().minusHours(7));
        todoStorage.add(item2);

        TodoItem item3 = new TodoItem();
        item3.setId(idSequence.getAndIncrement());
        item3.setTitle("Design Frontend Interface");
        item3.setDescription("Create modern responsive UI with HTML/CSS and Vanilla JS");
        item3.setCompleted(false);
        item3.setPriority(Priority.HIGH);
        item3.setDueDate(LocalDateTime.now().plusDays(3));
        item3.setCreatedAt(LocalDateTime.now().minusHours(6));
        item3.setUpdatedAt(LocalDateTime.now().minusHours(6));
        todoStorage.add(item3);

        TodoItem item4 = new TodoItem();
        item4.setId(idSequence.getAndIncrement());
        item4.setTitle("Configure Docker Container");
        item4.setDescription("Write Dockerfile and docker-compose.yml for backend service");
        item4.setCompleted(false);
        item4.setPriority(Priority.HIGH);
        item4.setDueDate(LocalDateTime.now().plusDays(2));
        item4.setCreatedAt(LocalDateTime.now().minusHours(5));
        item4.setUpdatedAt(LocalDateTime.now().minusHours(5));
        todoStorage.add(item4);

        TodoItem item5 = new TodoItem();
        item5.setId(idSequence.getAndIncrement());
        item5.setTitle("Setup CI/CD GitHub Actions Workflow");
        item5.setDescription("Automate maven build and unit test execution on push");
        item5.setCompleted(false);
        item5.setPriority(Priority.MEDIUM);
        item5.setDueDate(LocalDateTime.now().plusDays(5));
        item5.setCreatedAt(LocalDateTime.now().minusHours(4));
        item5.setUpdatedAt(LocalDateTime.now().minusHours(4));
        todoStorage.add(item5);

        TodoItem item6 = new TodoItem();
        item6.setId(idSequence.getAndIncrement());
        item6.setTitle("Review Pull Requests & Refactor Code");
        item6.setDescription("Perform static code analysis and optimize memory allocations");
        item6.setCompleted(true);
        item6.setPriority(Priority.LOW);
        item6.setDueDate(LocalDateTime.now().minusDays(1));
        item6.setCreatedAt(LocalDateTime.now().minusHours(3));
        item6.setUpdatedAt(LocalDateTime.now().minusHours(1));
        todoStorage.add(item6);

        TodoItem item7 = new TodoItem();
        item7.setId(idSequence.getAndIncrement());
        item7.setTitle("Prepare Product Release Notes");
        item7.setDescription("Document API endpoints, payload formats, and release changelog");
        item7.setCompleted(false);
        item7.setPriority(Priority.LOW);
        item7.setDueDate(LocalDateTime.now().plusDays(7));
        item7.setCreatedAt(LocalDateTime.now().minusHours(2));
        item7.setUpdatedAt(LocalDateTime.now().minusHours(2));
        todoStorage.add(item7);

        TodoItem item8 = new TodoItem();
        item8.setId(idSequence.getAndIncrement());
        item8.setTitle("Setup Application Security & CORS");
        item8.setDescription("Configure cross-origin resource sharing headers and sanitization");
        item8.setCompleted(true);
        item8.setPriority(Priority.HIGH);
        item8.setDueDate(LocalDateTime.now().minusDays(2));
        item8.setCreatedAt(LocalDateTime.now().minusHours(1));
        item8.setUpdatedAt(LocalDateTime.now().minusMinutes(30));
        todoStorage.add(item8);
    }

    @Override
    public List<TodoItem> findAll() {
        return new ArrayList<>(todoStorage);
    }

    @Override
    public Optional<TodoItem> findById(Long id) {
        return todoStorage.stream()
                .filter(item -> item.getId().equals(id))
                .findFirst();
    }

    @Override
    public TodoItem save(TodoItem item) {
        if (item.getId() == null) {
            item.setId(idSequence.getAndIncrement());
            item.setCreatedAt(LocalDateTime.now());
            item.setUpdatedAt(LocalDateTime.now());
            todoStorage.add(item);
        } else {
            item.setUpdatedAt(LocalDateTime.now());
            for (int i = 0; i < todoStorage.size(); i++) {
                if (todoStorage.get(i).getId().equals(item.getId())) {
                    todoStorage.set(i, item);
                    break;
                }
            }
        }
        return item;
    }

    @Override
    public boolean deleteById(Long id) {
        return todoStorage.removeIf(item -> item.getId().equals(id));
    }

    @Override
    public void deleteAll() {
        todoStorage.clear();
    }

    @Override
    public void deleteCompleted() {
        todoStorage.removeIf(TodoItem::isCompleted);
    }
}
