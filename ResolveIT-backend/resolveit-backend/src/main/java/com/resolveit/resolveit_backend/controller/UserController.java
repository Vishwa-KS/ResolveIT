package com.resolveit.resolveit_backend.controller;

import com.resolveit.resolveit_backend.model.User;
import com.resolveit.resolveit_backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // CREATE ACCOUNT (SIGN UP)  -> POST /api/users
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {

        // ---- basic validation: only username & password are REQUIRED ----
        String username = user.getUsername() != null ? user.getUsername().trim() : "";
        String password = user.getPassword() != null ? user.getPassword().trim() : "";

        if (username.isEmpty() || password.isEmpty()) {
            return ResponseEntity
                    .badRequest()
                    .body("username and password are required");
        }

        // unique username check
        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(409).body("Username already exists");
        }

        // normalise fields
        user.setUsername(username);
        user.setPassword(password);

        // default role (from UI we send CITIZEN / OFFICER / ADMIN, but keep fallback)
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("CITIZEN");
        }

        // default name = username if not provided
        if (user.getName() == null || user.getName().isBlank()) {
            user.setName(username);
        }

        // email is NOT in your signup form, so auto-generate something unique
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            // this respects NOT NULL + UNIQUE constraint
            user.setEmail(username + "@resolveit.local");
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(saved);
    }

    // LOGIN -> POST /api/users/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User req) {

        String username = req.getUsername() != null ? req.getUsername().trim() : "";
        String password = req.getPassword() != null ? req.getPassword().trim() : "";

        if (username.isEmpty() || password.isEmpty()) {
            return ResponseEntity
                    .badRequest()
                    .body("username and password are required");
        }

        User user = userRepository.findByUsername(username);

        if (user == null || !user.getPassword().equals(password)) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }

        return ResponseEntity.ok(user);
    }
}
