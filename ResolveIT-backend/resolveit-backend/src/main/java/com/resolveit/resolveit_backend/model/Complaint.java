package com.resolveit.resolveit_backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idcomplaint")
    private Integer id;

    /* ==========================================================
       Original complaint image (citizen upload)
    ========================================================== */
    @Column(name = "image_path")
    private String imagePath;

    // Optional Base64 image storage (not used for now)
    @Column(name = "image_data", columnDefinition = "LONGTEXT")
    private String imageData;

    /* ==========================================================
       Resolution image (officer upload after fix)
    ========================================================== */
    @Column(name = "resolution_image_path")
    private String resolutionImagePath;

    @Column(name = "resolution_image_data", columnDefinition = "LONGTEXT")
    private String resolutionImageData;

    /* ==========================================================
       Complaint Main Fields
    ========================================================== */
    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    private String category;
    private String priority;

    @Column(name = "citizen_name")
    private String citizenName;

    private String status;

    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "updated_at")
    private String updatedAt;

    /* ==========================================================
       Admin + Officer Fields
    ========================================================== */

    @Column(name = "assigned_staff")
    private String assignedStaff;

    @Column(name = "deadline")
    private String deadline;

    @Column(name = "deadline_iso")
    private String deadlineIso;

    @Column(name = "admin_comments", columnDefinition = "TEXT")
    private String adminComments;

    @Column(name = "internal_notes", columnDefinition = "TEXT")
    private String internalNotes;

    @Column(name = "alert_message", columnDefinition = "TEXT")
    private String alertMessage;

    @Column(name = "last_alert_at")
    private String lastAlertAt;

    @Column(name = "is_escalated")
    private Boolean isEscalated;

    @Column(name = "officer_notes", columnDefinition = "TEXT")
    private String officerNotes;

    /* ==========================================================
       GETTERS + SETTERS
    ========================================================== */

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public String getImageData() {
        return imageData;
    }

    public void setImageData(String imageData) {
        this.imageData = imageData;
    }

    public String getResolutionImagePath() {
        return resolutionImagePath;
    }

    public void setResolutionImagePath(String resolutionImagePath) {
        this.resolutionImagePath = resolutionImagePath;
    }

    public String getResolutionImageData() {
        return resolutionImageData;
    }

    public void setResolutionImageData(String resolutionImageData) {
        this.resolutionImageData = resolutionImageData;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getCitizenName() {
        return citizenName;
    }

    public void setCitizenName(String citizenName) {
        this.citizenName = citizenName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getAssignedStaff() {
        return assignedStaff;
    }

    public void setAssignedStaff(String assignedStaff) {
        this.assignedStaff = assignedStaff;
    }

    public String getDeadline() {
        return deadline;
    }

    public void setDeadline(String deadline) {
        this.deadline = deadline;
    }

    public String getDeadlineIso() {
        return deadlineIso;
    }

    public void setDeadlineIso(String deadlineIso) {
        this.deadlineIso = deadlineIso;
    }

    public String getAdminComments() {
        return adminComments;
    }

    public void setAdminComments(String adminComments) {
        this.adminComments = adminComments;
    }

    public String getInternalNotes() {
        return internalNotes;
    }

    public void setInternalNotes(String internalNotes) {
        this.internalNotes = internalNotes;
    }

    public String getAlertMessage() {
        return alertMessage;
    }

    public void setAlertMessage(String alertMessage) {
        this.alertMessage = alertMessage;
    }

    public String getLastAlertAt() {
        return lastAlertAt;
    }

    public void setLastAlertAt(String lastAlertAt) {
        this.lastAlertAt = lastAlertAt;
    }

    public Boolean getIsEscalated() {
        return isEscalated;
    }

    public void setIsEscalated(Boolean escalated) {
        this.isEscalated = escalated;
    }

    public String getOfficerNotes() {
        return officerNotes;
    }

    public void setOfficerNotes(String officerNotes) {
        this.officerNotes = officerNotes;
    }
}
