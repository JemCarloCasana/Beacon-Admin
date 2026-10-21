import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

describe("Dialog", () => {
  it("uses the caller's title as the dialog's accessible name", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge SOS</DialogTitle>
            <DialogDescription>Choose the responder.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole("dialog", { name: "Acknowledge SOS" })).toBeInTheDocument();
  });

  it("does not announce every dialog as 'Dialog'", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark SOS as Resolved</DialogTitle>
            <DialogDescription>Pick the outcome.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByRole("dialog", { name: "Dialog" })).not.toBeInTheDocument();
  });
});
