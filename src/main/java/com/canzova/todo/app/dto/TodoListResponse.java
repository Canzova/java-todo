package com.canzova.todo.app.dto;

import java.util.List;

public class TodoListResponse {

    private int totalCount;
    private int completedCount;
    private int pendingCount;
    private List<TodoResponse> todos;

    public TodoListResponse() {
    }

    public TodoListResponse(int totalCount, int completedCount, int pendingCount, List<TodoResponse> todos) {
        this.totalCount = totalCount;
        this.completedCount = completedCount;
        this.pendingCount = pendingCount;
        this.todos = todos;
    }

    public int getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(int totalCount) {
        this.totalCount = totalCount;
    }

    public int getCompletedCount() {
        return completedCount;
    }

    public void setCompletedCount(int completedCount) {
        this.completedCount = completedCount;
    }

    public int getPendingCount() {
        return pendingCount;
    }

    public void setPendingCount(int pendingCount) {
        this.pendingCount = pendingCount;
    }

    public List<TodoResponse> getTodos() {
        return todos;
    }

    public void setTodos(List<TodoResponse> todos) {
        this.todos = todos;
    }
}
