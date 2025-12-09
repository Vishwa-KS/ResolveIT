package com.resolveit.resolveit_backend.controller;

import com.resolveit.resolveit_backend.model.Complaint;
import com.resolveit.resolveit_backend.repository.ComplaintRepository;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;

import org.springframework.data.domain.Sort;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = "*")
public class ComplaintController {

    private final ComplaintRepository complaintRepository;

    public ComplaintController(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

    // CREATE COMPLAINT (with optional image)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Complaint> createComplaint(
            @RequestParam("subject") String subject,
            @RequestParam("description") String description,
            @RequestParam("category") String category,
            @RequestParam("priority") String priority,
            @RequestParam("citizenName") String citizenName,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {

        Complaint c = new Complaint();
        c.setSubject(subject);
        c.setDescription(description);
        c.setCategory(category);
        c.setPriority(priority);
        c.setCitizenName(citizenName);

        // defaults
        c.setStatus("Under Review");
        String now = LocalDateTime.now().toString();
        c.setCreatedAt(now);
        c.setUpdatedAt(now);
        c.setAssignedStaff("Not assigned");

        // image upload
        if (image != null && !image.isEmpty()) {
            try {
                Path uploadDir = Paths.get("uploads");
                if (!Files.exists(uploadDir)) {
                    Files.createDirectories(uploadDir);
                }

                String original = image.getOriginalFilename();
                String safe = (original == null ? "img" : original.replaceAll("\\s+", "_"));
                String fileName = System.currentTimeMillis() + "_" + safe;

                Path filePath = uploadDir.resolve(fileName);
                Files.copy(image.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

                c.setImagePath(fileName);

            } catch (IOException ex) {
                ex.printStackTrace();
            }
        }

        Complaint saved = complaintRepository.save(c);
        return ResponseEntity.ok(saved);
    }

    // READ ONE
    @GetMapping("/{id}")
    public ResponseEntity<Complaint> getComplaintById(@PathVariable Integer id) {
        return complaintRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // SERVE ORIGINAL IMAGE
    @GetMapping("/{id}/image")
    public ResponseEntity<Resource> getComplaintImage(@PathVariable Integer id) {
        var optional = complaintRepository.findById(id);
        if (optional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Complaint c = optional.get();
        String imagePath = c.getImagePath();

        if (imagePath == null || imagePath.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path uploadDir = Paths.get("uploads");
            Path filePath = uploadDir.resolve(imagePath);

            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);

        } catch (IOException ex) {
            ex.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // RESOLUTION IMAGE – UPLOAD (Officer proof)
    @PostMapping(
            value = "/{id}/resolution-image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<Void> uploadResolutionImage(
            @PathVariable Integer id,
            @RequestPart("file") MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            Path uploadDir = Paths.get("uploads", "resolution");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            String fileName = "resolution_" + id;
            Path filePath = uploadDir.resolve(fileName);

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.ok().build();

        } catch (IOException ex) {
            ex.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // RESOLUTION IMAGE – GET
    @GetMapping("/{id}/resolution-image")
    public ResponseEntity<Resource> getResolutionImage(@PathVariable Integer id) {
        try {
            Path uploadDir = Paths.get("uploads", "resolution");
            Path filePath = uploadDir.resolve("resolution_" + id);

            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "image/jpeg";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);

        } catch (IOException ex) {
            ex.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // UPDATE COMPLAINT
    @PutMapping("/{id}")
    public ResponseEntity<Complaint> updateComplaint(
            @PathVariable Integer id,
            @RequestBody Complaint updates) {

        return complaintRepository.findById(id)
                .map(existing -> {

                    if (updates.getStatus() != null)        existing.setStatus(updates.getStatus());
                    if (updates.getPriority() != null)      existing.setPriority(updates.getPriority());
                    if (updates.getCategory() != null)      existing.setCategory(updates.getCategory());
                    if (updates.getAssignedStaff() != null) existing.setAssignedStaff(updates.getAssignedStaff());
                    if (updates.getDeadline() != null)      existing.setDeadline(updates.getDeadline());
                    if (updates.getDeadlineIso() != null)   existing.setDeadlineIso(updates.getDeadlineIso());
                    if (updates.getAdminComments() != null) existing.setAdminComments(updates.getAdminComments());
                    if (updates.getInternalNotes() != null) existing.setInternalNotes(updates.getInternalNotes());
                    if (updates.getAlertMessage() != null)  existing.setAlertMessage(updates.getAlertMessage());
                    if (updates.getLastAlertAt() != null)   existing.setLastAlertAt(updates.getLastAlertAt());
                    if (updates.getIsEscalated() != null)   existing.setIsEscalated(updates.getIsEscalated());
                    if (updates.getOfficerNotes() != null)  existing.setOfficerNotes(updates.getOfficerNotes());

                    existing.setUpdatedAt(LocalDateTime.now().toString());

                    Complaint saved = complaintRepository.save(existing);
                    return ResponseEntity.ok(saved);

                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // READ CITIZEN COMPLAINTS
    @GetMapping("/citizen/{name}")
    public List<Complaint> getByCitizen(@PathVariable("name") String name) {
        return complaintRepository.findByCitizenName(name);
    }

    // READ OFFICER COMPLAINTS
    @GetMapping("/officer/{name}")
    public List<Complaint> getByOfficer(@PathVariable("name") String name) {
        return complaintRepository.findByAssignedStaff(name);
    }

    // READ ALL (ADMIN) – sorted by ID ascending
    @GetMapping
    public List<Complaint> getAll() {
        return complaintRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
    }

    // EXPORT ALL COMPLAINTS AS CSV (ADMIN)
    @GetMapping("/export/csv")
    public ResponseEntity<Resource> exportComplaintsCsv() {

        List<Complaint> complaints =
                complaintRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));

        StringBuilder sb = new StringBuilder();

        sb.append("ID,Subject,Category,Priority,Status,Citizen,AssignedStaff,CreatedAt,UpdatedAt,Deadline\n");

        for (Complaint c : complaints) {
            sb.append(safeCsv(c.getId()))
              .append(',')
              .append(safeCsv(c.getSubject()))
              .append(',')
              .append(safeCsv(c.getCategory()))
              .append(',')
              .append(safeCsv(c.getPriority()))
              .append(',')
              .append(safeCsv(c.getStatus()))
              .append(',')
              .append(safeCsv(c.getCitizenName()))
              .append(',')
              .append(safeCsv(c.getAssignedStaff()))
              .append(',')
              .append(safeCsv(c.getCreatedAt()))
              .append(',')
              .append(safeCsv(c.getUpdatedAt()))
              .append(',')
              .append(safeCsv(c.getDeadline()))
              .append('\n');
        }

        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        ByteArrayResource resource = new ByteArrayResource(bytes);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"complaints_export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .contentLength(bytes.length)
                .body(resource);
    }

    private String safeCsv(Object value) {
        if (value == null) return "";
        String s = value.toString();
        s = s.replace("\"", "\"\"");
        return "\"" + s + "\"";
    }

    // DELETE COMPLAINT
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComplaint(@PathVariable Integer id) {
        if (!complaintRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        complaintRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ASSIGN ENDPOINT
    @PutMapping("/{id}/assign")
    public ResponseEntity<Complaint> assignOfficer(
            @PathVariable Integer id,
            @RequestBody Complaint updated) {

        return complaintRepository.findById(id)
                .map(existing -> {

                    if (updated.getAssignedStaff() != null) {
                        existing.setAssignedStaff(updated.getAssignedStaff());
                    }
                    if (updated.getDeadline() != null) {
                        existing.setDeadline(updated.getDeadline());
                    }
                    if (updated.getDeadlineIso() != null) {
                        existing.setDeadlineIso(updated.getDeadlineIso());
                    }

                    existing.setUpdatedAt(LocalDateTime.now().toString());

                    Complaint saved = complaintRepository.save(existing);
                    return ResponseEntity.ok(saved);

                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
