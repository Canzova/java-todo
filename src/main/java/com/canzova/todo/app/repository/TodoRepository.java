package com.canzova.todo.app.repository;

import com.canzova.todo.app.model.TodoItem;

import java.util.List;
import java.util.Optional;

public interface TodoRepository {
    List<TodoItem> findAll();
    Optional<TodoItem> findById(Long id);
    TodoItem save(TodoItem item);
    boolean deleteById(Long id);
    void deleteAll();
    void deleteCompleted();
}
