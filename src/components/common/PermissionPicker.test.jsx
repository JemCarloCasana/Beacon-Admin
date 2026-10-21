import { fireEvent, render, screen } from "@testing-library/react";
import PermissionPicker from "@/components/common/PermissionPicker";

describe("PermissionPicker", () => {
  it("offers exactly the permissions it is given", () => {
    render(
      <PermissionPicker
        permissions={["manage_sos", "view_incidents"]}
        value={[]}
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText("manage_sos")).toBeInTheDocument();
    expect(screen.getByLabelText("view_incidents")).toBeInTheDocument();
    expect(screen.queryByLabelText("manage_admins")).not.toBeInTheDocument();
  });

  it("shows the selected permissions as checked", () => {
    render(
      <PermissionPicker
        permissions={["manage_sos", "view_incidents"]}
        value={["manage_sos"]}
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText("manage_sos")).toBeChecked();
    expect(screen.getByLabelText("view_incidents")).not.toBeChecked();
  });

  it("reports the new selection when a permission is toggled on", () => {
    const onChange = vi.fn();
    render(
      <PermissionPicker
        permissions={["manage_sos", "view_incidents"]}
        value={["manage_sos"]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText("view_incidents"));

    expect(onChange).toHaveBeenCalledWith(["manage_sos", "view_incidents"]);
  });

  it("reports the new selection when a selected permission is cleared", () => {
    const onChange = vi.fn();
    render(
      <PermissionPicker
        permissions={["manage_sos", "view_incidents"]}
        value={["manage_sos", "view_incidents"]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText("manage_sos"));

    expect(onChange).toHaveBeenCalledWith(["view_incidents"]);
  });

  it("names the permission code so the operator can see what is granted", () => {
    render(
      <PermissionPicker
        permissions={["manage_sos"]}
        value={[]}
        onChange={() => {}}
      />
    );

    expect(screen.getByText("manage_sos")).toBeInTheDocument();
    expect(screen.getByText(/respond to sos/i)).toBeInTheDocument();
  });

  it("does not report a change while disabled", () => {
    const onChange = vi.fn();
    render(
      <PermissionPicker
        permissions={["manage_sos", "view_incidents"]}
        value={["manage_sos"]}
        onChange={onChange}
        disabled
      />
    );

    fireEvent.click(screen.getByLabelText("view_incidents"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("gives each picker its own control ids so two pickers do not collide", () => {
    render(
      <>
        <PermissionPicker
          permissions={["manage_sos"]}
          value={[]}
          onChange={() => {}}
          idPrefix="create"
        />
        <PermissionPicker
          permissions={["manage_sos"]}
          value={[]}
          onChange={() => {}}
          idPrefix="edit"
        />
      </>
    );

    expect(screen.getAllByLabelText("manage_sos")).toHaveLength(2);
    expect(screen.getAllByLabelText("manage_sos")[0].id).not.toBe(
      screen.getAllByLabelText("manage_sos")[1].id
    );
  });
});
