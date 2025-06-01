export class InteractionSystem {
  constructor() {
    this.INTERACTION_DISTANCE = 2.0;
    this.currentInteractables = [];
  }

  handleInteraction(playerPosition) {
    // Find nearest interactable object
    const nearestObject = this.findNearestInteractable(playerPosition);

    if (nearestObject) {
      switch (nearestObject.type) {
        case "door":
          this.handleDoorInteraction(nearestObject);
          break;
        case "elevator":
          this.triggerElevatorTransition(nearestObject);
          break;
        case "department":
          this.showDepartmentEntryModal(nearestObject.name);
          break;
        default:
          console.log("Unknown interaction type:", nearestObject.type);
      }
    }
  }

  findNearestInteractable(playerPosition) {
    let nearest = null;
    let minDistance = Infinity;

    for (const object of this.currentInteractables) {
      const distance = this.distanceBetween(
        playerPosition.x,
        playerPosition.z,
        object.position.x,
        object.position.z
      );

      if (distance < this.INTERACTION_DISTANCE && distance < minDistance) {
        nearest = object;
        minDistance = distance;
      }
    }

    return nearest;
  }

  handleDoorInteraction(door) {
    if (!door.isLocked) {
      // Toggle door state
      door.isOpen = !door.isOpen;

      // Trigger animation
      if (door.type === "elevator") {
        this.animateElevatorDoors(door.isOpen);
      } else {
        this.animateDoor(door);
      }
    } else {
      console.log("This door is locked.");
    }
  }

  triggerElevatorTransition(elevator) {
    if (elevator.isOpen) {
      // Start transition animation
      this.animateElevatorDoors(false);

      // Trigger level change after doors close
      setTimeout(() => {
        this.changeLevel(elevator.destination);
        setTimeout(() => {
          this.animateElevatorDoors(true);
        }, 1000);
      }, 2000);
    }
  }

  showDepartmentEntryModal(departmentName) {
    // This would be implemented according to your UI system
    console.log(`Showing entry modal for ${departmentName}`);
  }

  distanceBetween(x1, z1, x2, z2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
  }

  // Animation methods would be implemented according to your animation system
  animateElevatorDoors(open) {
    console.log(`Animating elevator doors: ${open ? "open" : "close"}`);
  }

  animateDoor(door) {
    console.log(`Animating door: ${door.isOpen ? "open" : "close"}`);
  }

  changeLevel(destination) {
    console.log(`Changing level to: ${destination}`);
  }

  // Method to update available interactables
  updateInteractables(objects) {
    this.currentInteractables = objects;
  }
}
