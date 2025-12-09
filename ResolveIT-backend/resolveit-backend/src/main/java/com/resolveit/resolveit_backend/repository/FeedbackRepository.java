package com.resolveit.resolveit_backend.repository;

import com.resolveit.resolveit_backend.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Integer> {

    // Normally only one feedback per complaint, but we keep list for flexibility
    List<Feedback> findByComplaintId(Integer complaintId);
}
