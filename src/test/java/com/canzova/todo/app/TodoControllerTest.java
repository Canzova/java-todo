package com.canzova.todo.app;

import com.canzova.todo.app.dto.CreateTodoRequest;
import com.canzova.todo.app.dto.UpdateTodoRequest;
import com.canzova.todo.app.model.Priority;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class TodoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testGetAllTodos() throws Exception {
        mockMvc.perform(get("/api/todos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todos", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.totalCount", greaterThanOrEqualTo(1)));
    }

    @Test
    void testGetTodoById() throws Exception {
        mockMvc.perform(get("/api/todos/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("Setup Spring Boot Todo App"));
    }

    @Test
    void testGetTodoByIdNotFound() throws Exception {
        mockMvc.perform(get("/api/todos/9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    void testCreateTodo() throws Exception {
        CreateTodoRequest request = new CreateTodoRequest();
        request.setTitle("Buy Groceries");
        request.setDescription("Milk, Eggs, Bread");
        request.setPriority(Priority.HIGH);

        mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title").value("Buy Groceries"))
                .andExpect(jsonPath("$.completed").value(false))
                .andExpect(jsonPath("$.priority").value("HIGH"));
    }

    @Test
    void testCreateTodoValidationFailure() throws Exception {
        CreateTodoRequest request = new CreateTodoRequest();
        request.setTitle("   "); // Blank title

        mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.details.title").exists());
    }

    @Test
    void testUpdateTodo() throws Exception {
        UpdateTodoRequest request = new UpdateTodoRequest();
        request.setTitle("Updated Todo Title");
        request.setCompleted(true);

        mockMvc.perform(put("/api/todos/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2))
                .andExpect(jsonPath("$.title").value("Updated Todo Title"))
                .andExpect(jsonPath("$.completed").value(true));
    }

    @Test
    void testToggleTodoCompletion() throws Exception {
        mockMvc.perform(patch("/api/todos/1/toggle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void testDeleteTodo() throws Exception {
        // First create a todo to delete
        CreateTodoRequest request = new CreateTodoRequest();
        request.setTitle("Temp todo to delete");

        String responseStr = mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Integer createdId = objectMapper.readTree(responseStr).get("id").asInt();

        // Delete created todo
        mockMvc.perform(delete("/api/todos/" + createdId))
                .andExpect(status().isNoContent());

        // Verify it no longer exists
        mockMvc.perform(get("/api/todos/" + createdId))
                .andExpect(status().isNotFound());
    }
}
