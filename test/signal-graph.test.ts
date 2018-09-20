/*import { Subject, Observable } from "rxjs";

type Email = string
type Password = string
type Id = number
type UserId = Id;
type BoardId = Id;
type StickyId = Id;

interface User {
  id: UserId;
}

interface Board {
  collaboratorId: UserId[];
}

interface Sticky {
  content: String
}

interface Actions {
  email: Email | undefined;
  password: Password | undefined;
  login: undefined;
  selectedBoard: BoardId;
  newStickyRequest: string;
  updateStickyRequest: string;
  selectSticky: StickyId;
}

interface States {
  activeUser: User;
  activeBoardsForUser: Board[];
  activeBoard: Board;
  boardCollaborators: User[];
  collaboratorStickies: Sticky[];
  activeBoardStickies: Sticky[];
  activeSticky: Sticky
  updatedSticky: Sticky
  newSticky: Sticky
}

/**
 * Dummy test
 */
/*
describe("Dummy test", () => {
  it("works if true is truthy", () => {
    expect(true).toBeTruthy()
  })

  it("DummyClass is instantiable", () => {
    expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })
})
*/
