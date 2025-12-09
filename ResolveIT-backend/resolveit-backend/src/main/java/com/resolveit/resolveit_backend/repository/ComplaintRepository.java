package com.resolveit.resolveit_backend.repository;

import com.resolveit.resolveit_backend.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Integer> {

    // Citizen-specific
    List<Complaint> findByCitizenName(String citizenName);

    // Officer-specific
    List<Complaint> findByAssignedStaff(String assignedStaff);

    
}
