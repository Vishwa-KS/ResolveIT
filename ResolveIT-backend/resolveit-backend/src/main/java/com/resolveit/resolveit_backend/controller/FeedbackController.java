package com.resolveit.resolveit_backend.controller;

import com.resolveit.resolveit_backend.model.Feedback;
import com.resolveit.resolveit_backend.repository.FeedbackRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = "*")
public class FeedbackController {

    private final FeedbackRepository feedbackRepo;

    public FeedbackController(FeedbackRepository feedbackRepo) {
        this.feedbackRepo = feedbackRepo;
    }

    // Citizen submits feedback for a complaint
    @PostMapping("/{complaintId}")
    public ResponseEntity<Feedback> addFeedback(
            @PathVariable Integer complaintId,
            @RequestBody Feedback req) {

        if (req.getRating() == null || req.getRating() < 1 || req.getRating() > 5) {
            return ResponseEntity.badRequest().build();
        }

        Feedback f = new Feedback();
        f.setComplaintId(complaintId);
        f.setCitizenName(req.getCitizenName());
        f.setRating(req.getRating());
        f.setComments(req.getComments());
        f.setCreatedAt(LocalDateTime.now().toString());

        Feedback saved = feedbackRepo.save(f);
        return ResponseEntity.ok(saved);
    }

    // Get feedback for a complaint (citizen/admin/officer)
    @GetMapping("/{complaintId}")
    public List<Feedback> getFeedback(@PathVariable Integer complaintId) {
        return feedbackRepo.findByComplaintId(complaintId);
    }
}
